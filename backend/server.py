import asyncio
import re
import uuid
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from agent import WORKSPACE, Session, client, handle_message, safe_path
from settings import SETTINGS, save_settings

app = FastAPI(title="Vernesser Office")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIRM_TIMEOUT = 120  # seconds to wait for Yes/No before treating it as "No"


@app.get("/")
def health():
    """Quick check that the server is running."""
    return {"status": "Vernesser is online"}


# ---------- FILES ----------
@app.post("/upload")
async def upload(file: UploadFile):
    """Save an uploaded file into workspace/uploads."""
    name = re.sub(r"[^\w.\- ]", "_", Path(file.filename).name)
    path = safe_path(f"uploads/{name}")
    path.write_bytes(await file.read())
    return {"saved": f"uploads/{name}"}


@app.get("/files")
def list_outputs():
    """List every file Vernesser has created."""
    outputs = WORKSPACE / "outputs"
    files = [
        str(p.relative_to(outputs)).replace("\\", "/")
        for p in outputs.rglob("*") if p.is_file()
    ]
    return {"files": sorted(files)}


@app.get("/download/{file_path:path}")
def download(file_path: str):
    """Send an output file back to the browser."""
    try:
        path = safe_path(f"outputs/{file_path}")
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=path.name)


# ---------- BRAIN SETTINGS ----------
ThinkLevel = Literal["off", "on", "low", "medium", "high"]


class BrainSettings(BaseModel):
    """The shape of valid settings. FastAPI rejects anything else automatically."""
    model: str
    think_agent: ThinkLevel
    think_fast: ThinkLevel
    num_ctx: Literal[4096, 8192, 16384, 32768]
    keep_alive: Literal["5m", "30m", "2h", "-1"]


@app.get("/settings")
def get_settings():
    return SETTINGS


@app.put("/settings")
async def update_settings(new: BrainSettings):
    installed = await client.list()
    names = [m.model for m in installed.models]
    if new.model not in names:
        raise HTTPException(status_code=400, detail=f"'{new.model}' is not installed. Run: ollama pull {new.model}")
    return save_settings(new.model_dump())


@app.get("/models")
async def models():
    """Installed models, plus which ones are on the GPU right now."""
    try:
        installed = await client.list()
        loaded = await client.ps()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Can't reach Ollama: {e}")
    return {
        "installed": [
            {"name": m.model, "size_gb": round(m.size / 1e9, 1)} for m in installed.models
        ],
        "loaded": [
            {
                "name": m.model,
                "vram_gb": round(m.size_vram / 1e9, 1),
                "gpu_percent": round(100 * m.size_vram / m.size) if m.size else 0,
            }
            for m in loaded.models
        ],
    }


@app.post("/models/unload")
async def unload_models():
    """Free the GPU: unload every model that is loaded right now."""
    loaded = await client.ps()
    for m in loaded.models:
        await client.generate(model=m.model, prompt="", keep_alive=0)
    return {"unloaded": [m.model for m in loaded.models]}


# ---------- LIVE CHAT ----------
@app.websocket("/ws")
async def chat(ws: WebSocket):
    """Live chat: receive messages and Yes/No answers, stream events back."""
    await ws.accept()
    session = Session()
    pending = {}          # confirmation id → Future waiting for the user's Yes/No
    current_task = None   # the task Vernesser is working on right now

    async def emit(event: dict):
        await ws.send_json(event)

    async def ask(question: str) -> bool:
        """Show Yes/No buttons in the browser and WAIT for the answer."""
        confirm_id = uuid.uuid4().hex
        future = asyncio.get_running_loop().create_future()
        pending[confirm_id] = future
        await emit({"type": "confirm", "id": confirm_id, "question": question})
        try:
            return await asyncio.wait_for(future, timeout=CONFIRM_TIMEOUT)
        except asyncio.TimeoutError:
            return False
        finally:
            pending.pop(confirm_id, None)

    async def run_task(text: str):
        """Run one request in the background, then send the reply."""
        try:
            reply = await handle_message(session, text, emit, ask=ask)
        except Exception as e:
            reply = f"Something went wrong: {e}"
        await emit({"type": "reply", "text": reply})

    try:
        while True:
            data = await ws.receive_json()

            if data.get("type") == "confirm_reply":
                future = pending.get(data.get("id"))
                if future and not future.done():
                    future.set_result(bool(data.get("approved")))

            elif "message" in data:
                if current_task and not current_task.done():
                    continue
                current_task = asyncio.create_task(run_task(data["message"]))

    except WebSocketDisconnect:
        for future in pending.values():
            if not future.done():
                future.set_result(False)
        if current_task:
            current_task.cancel()
        print("A client disconnected.")