import re
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from agent import WORKSPACE, Session, handle_message, safe_path

app = FastAPI(title="Vernesser Office")

# Allow our React website (Step 7, runs on port 5173) to talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    """Quick check that the server is running."""
    return {"status": "Vernesser is online"}


@app.post("/upload")
async def upload(file: UploadFile):
    """Save an uploaded file into workspace/uploads."""
    name = re.sub(r"[^\w.\- ]", "_", Path(file.filename).name)   # clean the file name
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


@app.websocket("/ws")
async def chat(ws: WebSocket):
    """Live chat: receive messages, stream events back."""
    await ws.accept()
    session = Session()                      # this connection's own memory

    async def emit(event: dict):
        await ws.send_json(event)            # every event goes straight to the browser

    try:
        while True:
            data = await ws.receive_json()   # wait for {"message": "..."}
            try:
                reply = await handle_message(session, data["message"], emit)
            except Exception as e:
                reply = f"Something went wrong: {e}"
            await emit({"type": "reply", "text": reply})
    except WebSocketDisconnect:
        print("A client disconnected.")