import csv
import io
from pathlib import Path

from docx import Document
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter
from pypdf import PdfReader
from docx.table import Table

MAX_CHARS = 20000  # keeps file text small enough to fit the model's context
FONT_DIR = Path("C:/Windows/Fonts")


# ---------- READING ----------
def read_docx(path: Path) -> str:
    """Read a Word file in order, including tables."""
    doc = Document(path)
    lines = []
    for block in doc.iter_inner_content():        # paragraphs AND tables, in order
        if isinstance(block, Table):
            for row in block.rows:
                cells = []
                for cell in row.cells:
                    text = cell.text.strip()
                    if not cells or cells[-1] != text:   # skip repeats from merged cells
                        cells.append(text)
                lines.append(" | ".join(cells))
        else:
            lines.append(block.text)
    return "\n".join(lines)

def read_any_file(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        text = "\n".join(page.extract_text() or "" for page in PdfReader(path).pages)
    elif suffix == ".docx":
        text = read_docx(path)
    elif suffix == ".xlsx":
        wb = load_workbook(path, data_only=True)
        lines = []
        for ws in wb.worksheets:
            lines.append(f"## Sheet: {ws.title}")
            for row in ws.iter_rows(values_only=True):
                lines.append(", ".join("" if v is None else str(v) for v in row))
        text = "\n".join(lines)
    else:
        text = path.read_text(encoding="utf-8")

    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + f"\n\n[...cut off: file has {len(text)} characters, showing the first {MAX_CHARS}]"
    return text


# ---------- SIMPLE FORMATTING ----------
def parse_simple_markdown(content: str, title: str = ""):
    """Turn lines into (kind, data) pairs: 'h1', 'h2', 'bullet', 'para' or 'table'."""
    table = []
    for raw in content.splitlines() + [""]:          # the extra "" finishes a table at the very end
        line = raw.strip().replace("**", "")

        # --- table lines start with | ---
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            is_separator = all(set(c) <= set("-: ") for c in cells)   # the |---|---| line
            if not is_separator:
                table.append(cells)
            continue

        # a non-table line ends the table
        if table:
            yield "table", table
            table = []

        if not line:
            continue
        if line.startswith("#"):
            level = len(line) - len(line.lstrip("#"))
            text = line.lstrip("#").strip()
            if text.lower() == title.lower():
                continue
            yield ("h1" if level == 1 else "h2"), text
        elif line.startswith(("- ", "* ")):
            yield "bullet", line[2:]
        else:
            yield "para", line

# ---------- WORD ----------
def add_docx_table(doc, rows: list):
    """Add a real Word table with a bold header row."""
    width = max(len(r) for r in rows)
    table = doc.add_table(rows=0, cols=width)
    table.style = "Table Grid"                       # visible borders
    for i, row in enumerate(rows):
        cells = table.add_row().cells
        for j in range(width):
            cells[j].text = row[j] if j < len(row) else ""
            if i == 0:                               # header row → bold
                for run in cells[j].paragraphs[0].runs:
                    run.bold = True

def make_docx(path: Path, title: str, content: str):
    doc = Document()
    doc.add_heading(title, level=0)
    for kind, text in parse_simple_markdown(content, title):
        if kind == "h1":
            doc.add_heading(text, level=1)
        elif kind == "h2":
            doc.add_heading(text, level=2)
        elif kind == "bullet":
            doc.add_paragraph(text, style="List Bullet")
        elif kind == "table":
            add_docx_table(doc, text)                # here "text" is a list of rows
        else:
            doc.add_paragraph(text)
    doc.save(path)


# ---------- EXCEL ----------
def to_number(value: str):
    """'15,000' → 15000, 'PHP 99.5' → 99.5, anything else stays text."""
    cleaned = value.strip().replace(",", "").replace("PHP", "").replace("₱", "").strip()
    for convert in (int, float):
        try:
            return convert(cleaned)
        except ValueError:
            pass
    return value.strip()


def column_totals(rows: list) -> dict:
    """Add up every number column with code (not AI), skipping any 'Total' rows."""
    header, body = rows[0], rows[1:]
    totals = {}
    for row in body:
        if any("total" in cell.lower() for cell in row):
            continue
        for i, cell in enumerate(row):
            value = to_number(cell)
            if isinstance(value, (int, float)) and i < len(header):
                totals[header[i]] = totals.get(header[i], 0) + value
    return totals


def check_rows(rows: list) -> list:
    """Find rows with more cells than the header (usually a number written like 15,000)."""
    problems = []
    width = len(rows[0])
    for n, row in enumerate(rows[1:], start=2):
        if len(row) > width:
            problems.append(
                f"Row {n} has {len(row)} cells but the header has {width}: {row}. "
                f"Write numbers WITHOUT commas (1200, not 1,200)."
            )
    return problems

def repair_row(row: list, width: int) -> list:
    """Fix a number that was split by its comma: ['Contingency', '1', '200'] → ['Contingency', '1200']."""
    if len(row) <= width:
        return row
    tail = row[width - 1:]                      # the last column plus the extra pieces
    if all(cell.strip().isdigit() for cell in tail):
        return row[:width - 1] + ["".join(cell.strip() for cell in tail)]
    return row                                  # can't repair safely → leave it for check_rows to report

def make_xlsx(path: Path, csv_text: str):
    rows = list(csv.reader(io.StringIO(csv_text.strip())))
    rows = [rows[0]] + [repair_row(r, len(rows[0])) for r in rows[1:]]
    wb = Workbook()
    ws = wb.active
    for row in rows:
        ws.append([to_number(cell) for cell in row])
    for cell in ws[1]:
        cell.font = Font(bold=True)
            # Add a Total row with SUM formulas, if the model didn't add one
    totals = column_totals(rows)
    has_total_row = any(any("total" in c.lower() for c in row) for row in rows[1:])
    if totals and not has_total_row:
        last_row = ws.max_row
        total_row = ["Total"] + [""] * (len(rows[0]) - 1)
        for i, name in enumerate(rows[0]):
            if name in totals:
                col = get_column_letter(i + 1)          # 3 → "C"
                total_row[i] = f"=SUM({col}2:{col}{last_row})"
        ws.append(total_row)
        for cell in ws[ws.max_row]:
            cell.font = Font(bold=True)
    for column in ws.columns:
        width = max(len(str(c.value or "")) for c in column)
        ws.column_dimensions[column[0].column_letter].width = min(width + 2, 50)
    wb.save(path)
    return column_totals(rows), check_rows(rows)


# ---------- PDF ----------
def make_pdf(path: Path, title: str, content: str):
    pdf = FPDF()
    pdf.add_page()
    pdf.add_font("Arial", "", str(FONT_DIR / "arial.ttf"))
    pdf.add_font("Arial", "B", str(FONT_DIR / "arialbd.ttf"))

    def write(text, size, style="", indent=0):
        pdf.set_font("Arial", style, size)
        pdf.set_x(pdf.l_margin + indent)
        pdf.multi_cell(0, size * 0.6, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.ln(2)

    write(title, 20, "B")
    for kind, text in parse_simple_markdown(content, title):
        if kind == "h1":
            write(text, 16, "B")
        elif kind == "h2":
            write(text, 13, "B")
        elif kind == "bullet":
            write(f"•  {text}", 11, indent=5)
        elif kind == "table":
            pdf.set_font("Arial", "", 10)
            width = max(len(r) for r in text)
            with pdf.table() as table:
                for row in text:
                    pdf_row = table.row()
                    for j in range(width):
                        pdf_row.cell(row[j] if j < len(row) else "")
            pdf.ln(4)
        else:
            write(text, 11)
    pdf.output(str(path))