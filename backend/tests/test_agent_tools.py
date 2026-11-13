import pytest

import agent


@pytest.fixture
def workspace(tmp_path, monkeypatch):
    """Give every test its own fake, empty workspace (never touches your real files)."""
    (tmp_path / "outputs").mkdir()
    monkeypatch.setattr(agent, "WORKSPACE", tmp_path.resolve())
    return tmp_path


# ---------- Safety: the sandbox ----------
def test_safe_path_allows_paths_inside(workspace):
    assert agent.safe_path("outputs/a.txt") == (workspace / "outputs" / "a.txt").resolve()


@pytest.mark.parametrize("bad_path", [
    "../secret.txt",
    "outputs/../../escape.txt",
    "C:/Windows/System32/evil.dll",
])
def test_safe_path_blocks_escapes(workspace, bad_path):
    with pytest.raises(ValueError):
        agent.safe_path(bad_path)


def test_write_file_cannot_escape_the_workspace(workspace):
    with pytest.raises(ValueError):
        agent.write_file("../hacked.txt", "nope")


# ---------- Helpers ----------
def test_output_path_adds_missing_extension(workspace):
    assert agent.output_path("outputs/report", ".pdf").name == "report.pdf"


# ---------- The Excel tool's checks ----------
def test_excel_tool_rejects_wrong_total(workspace):
    result = agent.create_excel_file("outputs/b.xlsx", "Item,Cost\nA,100\nB,200", expected_total=500)
    assert result.startswith("ERROR")


def test_excel_tool_accepts_correct_total(workspace):
    result = agent.create_excel_file("outputs/b.xlsx", "Item,Cost\nA,100\nB,400", expected_total=500)
    assert result.startswith("Created Excel file")
    assert (workspace / "outputs" / "b.xlsx").exists()

# ---------- Human-in-the-loop ----------
def test_needs_confirmation_only_when_overwriting(workspace):
    # A new file: safe, no question
    assert agent.needs_confirmation("create_pdf", {"file_path": "outputs/new.pdf"}) is None

    # An existing file: ask first (even when the extension is left out)
    (workspace / "outputs" / "old.pdf").write_text("x")
    question = agent.needs_confirmation("create_pdf", {"file_path": "outputs/old"})
    assert "Overwrite" in question

    # Reading is never risky
    assert agent.needs_confirmation("read_file", {"file_path": "outputs/old.pdf"}) is None