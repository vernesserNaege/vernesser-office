import json
from pathlib import Path

SETTINGS_FILE = Path(__file__).parent / "settings.json"

# Used the first time, before you save anything
DEFAULTS = {
    "model": "gpt-oss:20b",
    "think_agent": "medium",   # how hard to think for real work
    "think_fast": "low",       # quick decisions like routing
    "num_ctx": 16384,          # context size in tokens (bigger = longer files, more VRAM)
    "keep_alive": "30m",       # how long the model stays on the GPU after the last message
}

# The LIVE settings: everything reads from this dictionary
SETTINGS = dict(DEFAULTS)

# Model families that understand True/False thinking
THINKING_FAMILIES = ("qwen3", "deepseek-r1")


def load_settings() -> dict:
    """Read settings.json (if it exists) into SETTINGS."""
    if SETTINGS_FILE.exists():
        try:
            saved = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            SETTINGS.update({k: v for k, v in saved.items() if k in DEFAULTS})
        except json.JSONDecodeError:
            pass  # a broken file → keep the defaults
    return SETTINGS


def save_settings(new: dict) -> dict:
    """Update SETTINGS and write them to settings.json."""
    SETTINGS.update({k: v for k, v in new.items() if k in DEFAULTS})
    SETTINGS_FILE.write_text(json.dumps(SETTINGS, indent=2), encoding="utf-8")
    return SETTINGS


def think_value(model: str, level: str):
    """ADAPTER: turn one thinking level into what each model family understands."""
    if model.startswith("gpt-oss"):
        # gpt-oss always thinks; it can't be turned off
        return {"off": "low", "on": "medium"}.get(level, level)
    if model.startswith(THINKING_FAMILIES):
        return level != "off"          # qwen3 & co: just on or off
    return None                        # this model doesn't support thinking → don't send it


def llm_args(kind: str = "agent") -> dict:
    """Everything client.chat() needs from the settings. kind = "agent" or "fast"."""
    s = SETTINGS
    level = s["think_fast"] if kind == "fast" else s["think_agent"]
    args = {
        "model": s["model"],
        "keep_alive": -1 if s["keep_alive"] == "-1" else s["keep_alive"],   # -1 = forever
        "options": {"num_ctx": s["num_ctx"]},
    }
    think = think_value(s["model"], level)
    if think is not None:
        args["think"] = think
    return args


load_settings()  # read the saved settings once, when the server starts