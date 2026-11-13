from openpyxl import load_workbook

from file_tools import (
    check_rows,
    column_totals,
    make_docx,
    make_xlsx,
    parse_simple_markdown,
    read_any_file,
    repair_row,
    to_number,
)


# ---------- to_number: turning text into numbers ----------
def test_to_number_handles_commas_and_currency():
    assert to_number("1500") == 1500
    assert to_number("15,000") == 15000
    assert to_number("PHP 99.5") == 99.5
    assert to_number("₱2,000") == 2000


def test_to_number_keeps_text_and_formulas():
    assert to_number("Food") == "Food"
    assert to_number("=SUM(C2:C5)") == "=SUM(C2:C5)"


# ---------- repair_row: the comma-loop bug (regression test) ----------
def test_repair_row_joins_split_number():
    assert repair_row(["Contingency", "1", "200"], 2) == ["Contingency", "1200"]


def test_repair_row_leaves_unfixable_rows_alone():
    row = ["Food", " drinks", "500"]  # a comma inside a name, not a number
    assert repair_row(row, 2) == row


def test_repair_row_keeps_good_rows():
    assert repair_row(["Venue", "3000"], 2) == ["Venue", "3000"]


def test_check_rows_reports_bad_row_with_its_content():
    problems = check_rows([["Item", "Cost"], ["Food", "drinks", "500"]])
    assert len(problems) == 1
    assert "Row 2" in problems[0]
    assert "drinks" in problems[0]   # shows the actual row, so the model can fix it


# ---------- column_totals: math done by code ----------
def test_column_totals_skips_total_row():
    rows = [["Item", "Cost"], ["A", "100"], ["B", "250"], ["Total", "350"]]
    assert column_totals(rows) == {"Cost": 350}


# ---------- parse_simple_markdown: formatting for Word/PDF ----------
def test_markdown_headings_bullets_and_title_skip():
    content = "# Title\n## Section\n- point one\nPlain text"
    result = list(parse_simple_markdown(content, title="Title"))
    assert result == [("h2", "Section"), ("bullet", "point one"), ("para", "Plain text")]


def test_markdown_table_at_the_end_is_not_lost():
    content = "Intro\n| A | B |\n|---|---|\n| 1 | 2 |"
    result = list(parse_simple_markdown(content))
    assert result == [("para", "Intro"), ("table", [["A", "B"], ["1", "2"]])]


# ---------- Real files ----------
def test_make_xlsx_adds_total_row_with_formula(tmp_path):
    path = tmp_path / "budget.xlsx"
    totals, problems = make_xlsx(path, "Item,Cost\nFood,700\nVenue,300")

    assert totals == {"Cost": 1000}
    assert problems == []
    ws = load_workbook(path).active
    assert ws["A4"].value == "Total"
    assert ws["B4"].value == "=SUM(B2:B3)"


def test_make_xlsx_repairs_split_number(tmp_path):
    totals, problems = make_xlsx(tmp_path / "b.xlsx", "Item,Cost\nContingency,1,200")
    assert totals == {"Cost": 1200}
    assert problems == []


def test_word_table_survives_a_round_trip(tmp_path):
    path = tmp_path / "memo.docx"
    make_docx(path, "Memo", "Hello team\n| Name | Task |\n|---|---|\n| Jen | Posters |")
    text = read_any_file(path)
    assert "Hello team" in text
    assert "Jen | Posters" in text   # the table was written AND read back correctly