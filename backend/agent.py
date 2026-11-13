import asyncio
import json
from datetime import datetime
from pathlib import Path
import ollama

from config import MODEL, THINK_AGENT, THINK_FAST
from file_tools import read_any_file, make_docx, make_xlsx, make_pdf
from roles import ROLES, build_system_prompt

WORKSPACE = (Path(__file__).parent.parent / "workspace").resolve()
client = ollama.AsyncClient()


# ---------- SAFETY ----------
def safe_path(relative_path: str) -> Path:
    """Turn a workspace path into a real path, and block anything outside the workspace."""
    path = (WORKSPACE / relative_path).resolve()
    if not path.is_relative_to(WORKSPACE):
        raise ValueError("Access denied: that path is outside the workspace.")
    return path


def output_path(file_path: str, extension: str) -> Path:
    """Safe path + correct extension + make sure the folder exists."""
    if not file_path.lower().endswith(extension):
        file_path += extension
    path = safe_path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


# ---------- TOOLS ----------
def get_current_time() -> str:
    """Get the current date and time."""
    return datetime.now().strftime("%A, %B %d, %Y %I:%M %p")


def list_files(folder: str) -> str:
    """List the files in a workspace folder.

    Args:
        folder: Folder inside the workspace, e.g. "uploads" or "outputs".
    """
    files = [p.name for p in safe_path(folder).iterdir()]
    return "\n".join(files) if files else "(empty folder)"


def read_file(file_path: str) -> str:
    """Read a file from the workspace. Works with .txt, .md, .csv, .pdf, .docx and .xlsx files.

    Args:
        file_path: Path inside the workspace, e.g. "uploads/report.pdf".
    """
    return read_any_file(safe_path(file_path))


def write_file(file_path: str, content: str) -> str:
    """Create or overwrite a plain text file (.txt, .md, .html, .css, .js, .csv, code files).

    Args:
        file_path: Path inside the workspace, e.g. "outputs/summary.md".
        content: The full text to write into the file.
    """
    path = safe_path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return f"Saved {len(content)} characters to {file_path}"


def create_word_document(file_path: str, title: str, content: str) -> str:
    """Create a Word (.docx) document, e.g. memos, letters, reports, HR documents.

    Args:
        file_path: Where to save it, e.g. "outputs/memo.docx".
        title: The document title.
        content: The body. Use "# " for headings, "## " for subheadings, "- " for bullet points, "| a | b |" lines for tables, plain lines for paragraphs.
    """
    path = output_path(file_path, ".docx")
    make_docx(path, title, content)
    return f"Created Word document: {path.relative_to(WORKSPACE)}"


def create_excel_file(file_path: str, csv_text: str, expected_total: float = 0) -> str:
    """Create an Excel (.xlsx) spreadsheet, e.g. budgets, schedules, trackers, lists.

    Args:
        file_path: Where to save it, e.g. "outputs/budget.xlsx".
        csv_text: The table as CSV text. First row = column headers. Write numbers WITHOUT commas or currency symbols (15000, not 15,000). Excel formulas like =SUM(C2:C6) are allowed.
        expected_total: For budgets, the amount the numbers must add up to (e.g. 50000). Use 0 if there is no target.
    """
    path = output_path(file_path, ".xlsx")
    totals, problems = make_xlsx(path, csv_text)
    report = ", ".join(f"{name} = {amount:,}" for name, amount in totals.items()) or "no number columns"

    errors = list(problems)
    if expected_total and expected_total not in totals.values():
        errors.append(f"The numbers add up to ({report}) but they must total {expected_total:,.0f}.")

    if errors:
        return "ERROR, the file is wrong: " + " ".join(errors) + " Fix it and call create_excel_file again."
    return f"Created Excel file: {path.relative_to(WORKSPACE)}. Totals calculated by code: {report}"


def create_pdf(file_path: str, title: str, content: str) -> str:
    """Create a PDF document, for anything that should be printed or sent as final.

    Args:
        file_path: Where to save it, e.g. "outputs/report.pdf".
        title: The document title.
        content: The body. Use "# " for headings, "## " for subheadings, "- " for bullet points, "| a | b |" lines for tables, plain lines for paragraphs.
    """
    path = output_path(file_path, ".pdf")
    make_pdf(path, title, content)
    return f"Created PDF: {path.relative_to(WORKSPACE)}"


TOOLS = {f.__name__: f for f in [
    get_current_time, list_files, read_file, write_file,
    create_word_document, create_excel_file, create_pdf,
]}


# ---------- THE ROUTER ----------
async def pick_role(user_input: str, current_role: str) -> tuple:
    """Ask the model which department should handle this request."""
    menu = "\n".join(f"- {name}: {r['description']}" for name, r in ROLES.items())
    response = await client.chat(
        model=MODEL,
        messages=[{"role": "user", "content": f"""You route requests to the right department of an office.

Departments:
{menu}

Rules:
- Choose the department whose description best matches the request.
- Keep the current department ("{current_role}") ONLY if the request is a short follow-up that makes no sense on its own, like "make it shorter" or "change the colors".
- Give the reason in ONE short sentence.

Request: {user_input}"""}],
        format={
            "type": "object",
            "properties": {
                "reason": {"type": "string"},
                "role": {"type": "string", "enum": list(ROLES)},
            },
            "required": ["reason", "role"],
        },
        think=THINK_FAST,
        options={"temperature": 0},
    )
    try:
        data = json.loads(response.message.content)
    except (json.JSONDecodeError, TypeError):
        data = {"role": "general", "reason": "router reply was unreadable, so I used the Front Desk"}
    role = data.get("role", "general")
    return (role if role in ROLES else "general"), data.get("reason", "")


# ---------- THE AGENT LOOP ----------
async def run_agent(messages: list, emit) -> str:
    error_counts = {}  # how many times each error has happened (loop guard)

    for step in range(10):
        await emit({"type": "state", "state": "thinking"})
        response = await client.chat(
            model=MODEL,
            messages=messages,
            tools=list(TOOLS.values()),
            think=THINK_AGENT,
        )
        msg = response.message
        messages.append(msg)

        # 💭 Show a short preview of the model's reasoning (gpt-oss)
        if getattr(msg, "thinking", None):
            await emit({"type": "reasoning", "text": msg.thinking[:250]})

        if not msg.tool_calls:
            return msg.content

        for call in msg.tool_calls:
            name = call.function.name
            args = call.function.arguments
            await emit({"type": "tool", "name": name, "args": str(args)[:200]})
            try:
                result = TOOLS[name](**args)
            except Exception as e:
                result = f"Error: {e}"
            await emit({"type": "tool_result", "name": name, "preview": str(result)[:300]})
            messages.append({"role": "tool", "tool_name": name, "content": str(result)})

            # Loop guard: stop if the same error keeps happening
            if str(result).startswith(("ERROR", "Error")):
                error_counts[str(result)] = error_counts.get(str(result), 0) + 1
                if error_counts[str(result)] >= 3:
                    return (
                        "I got stuck: the same error happened 3 times in a row, so I stopped.\n\n"
                        f"The error was: {str(result)[:200]}\n\n"
                        "Could you rephrase the request or give me more details?"
                    )

    return "I stopped after 10 steps to stay safe. Please break the task into smaller parts."


# ---------- ONE CONVERSATION ----------
class Session:
    """Everything one conversation needs to remember."""
    def __init__(self):
        self.current_role = "general"
        self.locked_role = None
        self.messages = [{"role": "system", "content": build_system_prompt("general")}]


async def handle_message(session: Session, user_input: str, emit, role: str = None, reason: str = "") -> str:
    """The single entry point. If role is given, the router is skipped."""
    # Manual department control
    if user_input.startswith("/role"):
        choice = user_input.removeprefix("/role").strip()
        if choice == "auto":
            session.locked_role = None
            return "Auto-routing is ON."
        if choice in ROLES:
            session.locked_role = choice
            return f"Locked to {ROLES[choice]['title']}."
        return f"Unknown role. Choose: {', '.join(ROLES)}, auto"

    # Pick the department (unless someone already decided)
    if session.locked_role:
        role, reason = session.locked_role, "locked by user"
    elif role is None:
        role, reason = await pick_role(user_input, session.current_role)
    await emit({"type": "role", "role": role, "title": ROLES[role]["title"], "reason": reason})

    session.current_role = role
    session.messages[0] = {"role": "system", "content": build_system_prompt(role)}
    session.messages.append({"role": "user", "content": user_input})

    reply = await run_agent(session.messages, emit)
    await emit({"type": "state", "state": "idle"})
    return reply


# ---------- TERMINAL FRONT-END ----------
async def print_event(event: dict):
    """How the terminal shows events."""
    if event["type"] == "role":
        print(f"  🏢 {event['title']}: {event['reason']}")
    elif event["type"] == "reasoning":
        print(f"  💭 {event['text'][:120]}")
    elif event["type"] == "tool":
        print(f"  🔧 {event['name']}({event['args'][:80]})")
    elif event["type"] == "tool_result":
        print(f"  ↳ {event['preview'].replace(chr(10), ' ')}")


async def main():
    session = Session()
    print(f"Vernesser is ready ({MODEL}). Commands: /role <name>, /role auto, exit")
    print("Departments:", ", ".join(ROLES), "\n")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("exit", "quit"):
            break
        if not user_input:
            continue
        reply = await handle_message(session, user_input, print_event)
        print(f"Vernesser: {reply}\n")


if __name__ == "__main__":
    asyncio.run(main())