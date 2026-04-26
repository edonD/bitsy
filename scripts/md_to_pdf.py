"""Markdown → polished business-document PDF.

Renders a clean, reportlab-based PDF for each input markdown file and a
combined "operating plan" PDF that stitches the five Bitsy strategy documents
into one continuous deck.

No external CLI tools required — uses the `markdown` and `reportlab` packages
that are already installed.
"""

from __future__ import annotations

import re
from pathlib import Path
from datetime import date
from typing import Iterable

import markdown as md
from bs4 import BeautifulSoup, NavigableString
from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "pdfs"

DOCS = [
    {
        "input": "BITSY_GO_TO_MARKET_STRATEGY.md",
        "output": "bitsy-go-to-market-strategy.pdf",
        "title": "Bitsy Go-To-Market Strategy",
        "subtitle": "Operating plan for the first 90 days",
    },
    {
        "input": "BITSY_MARKET_RESEARCH_NEXT_STEPS.md",
        "output": "bitsy-market-research-next-steps.pdf",
        "title": "Market Research and Next Steps",
        "subtitle": "Wedge selection and execution plan",
    },
    {
        "input": "BITSY_AI_SUPPORT_QUESTION_SET.md",
        "output": "bitsy-ai-support-question-set.pdf",
        "title": "AI Support Question Set",
        "subtitle": "First category pack: AI Customer Support SaaS",
    },
    {
        "input": "BITSY_SAMPLE_REPORT_TEMPLATE.md",
        "output": "bitsy-sample-report-template.pdf",
        "title": "Sample Report Template",
        "subtitle": "AI visibility fix list — deliverable format",
    },
    {
        "input": "BITSY_OUTREACH_FIRST_CAMPAIGN.md",
        "output": "bitsy-outreach-first-campaign.pdf",
        "title": "First Outreach Campaign",
        "subtitle": "Target list, sequence, and trackable metrics",
    },
    {
        "input": "BITSY_FIRST_SALES_SPRINT.md",
        "output": "bitsy-first-sales-sprint.pdf",
        "title": "Bitsy First Sales Sprint",
        "subtitle": "The immediate action plan to validate demand",
    },
]

COMBINED_OUTPUT = "bitsy-combined-market-plan.pdf"
COMBINED_TITLE = "Bitsy Market Plan"
COMBINED_SUBTITLE = "Strategy, research, prospect list, sample report, and outreach"


# ── Styles ──────────────────────────────────────────────────────────────────

INK = colors.HexColor("#191612")
INK_2 = colors.HexColor("#3a3128")
MUTED = colors.HexColor("#72695c")
RULE = colors.HexColor("#cfc7b8")
QUOTE = colors.HexColor("#a8612e")  # rust accent for blockquotes


def make_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()["Normal"]
    body_font = "Helvetica"
    body_bold = "Helvetica-Bold"
    body_italic = "Helvetica-Oblique"
    code_font = "Courier"

    styles: dict[str, ParagraphStyle] = {}

    styles["Body"] = ParagraphStyle(
        "Body",
        parent=base,
        fontName=body_font,
        fontSize=10.5,
        leading=15,
        textColor=INK_2,
        spaceBefore=2,
        spaceAfter=8,
    )
    styles["BodyTight"] = ParagraphStyle(
        "BodyTight",
        parent=styles["Body"],
        spaceBefore=0,
        spaceAfter=0,
        leading=14,
    )
    styles["H1"] = ParagraphStyle(
        "H1",
        parent=base,
        fontName=body_bold,
        fontSize=22,
        leading=28,
        textColor=INK,
        spaceBefore=14,
        spaceAfter=10,
        keepWithNext=True,
    )
    styles["H2"] = ParagraphStyle(
        "H2",
        parent=base,
        fontName=body_bold,
        fontSize=15,
        leading=21,
        textColor=INK,
        spaceBefore=18,
        spaceAfter=6,
        keepWithNext=True,
    )
    styles["H3"] = ParagraphStyle(
        "H3",
        parent=base,
        fontName=body_bold,
        fontSize=12.5,
        leading=18,
        textColor=INK,
        spaceBefore=14,
        spaceAfter=4,
        keepWithNext=True,
    )
    styles["H4"] = ParagraphStyle(
        "H4",
        parent=base,
        fontName=body_bold,
        fontSize=11,
        leading=16,
        textColor=INK_2,
        spaceBefore=10,
        spaceAfter=2,
        keepWithNext=True,
    )
    styles["Quote"] = ParagraphStyle(
        "Quote",
        parent=styles["Body"],
        fontName=body_italic,
        fontSize=10.5,
        leading=15,
        textColor=INK_2,
        leftIndent=14,
        rightIndent=10,
        spaceBefore=6,
        spaceAfter=6,
        borderPadding=(6, 8, 6, 12),
    )
    styles["Code"] = ParagraphStyle(
        "Code",
        parent=base,
        fontName=code_font,
        fontSize=9,
        leading=12.5,
        textColor=INK_2,
        backColor=colors.HexColor("#f5f1ea"),
        borderColor=RULE,
        borderWidth=0.5,
        borderPadding=(6, 8, 6, 8),
        spaceBefore=8,
        spaceAfter=8,
    )
    styles["TitleBig"] = ParagraphStyle(
        "TitleBig",
        parent=base,
        fontName=body_bold,
        fontSize=32,
        leading=38,
        textColor=INK,
        spaceAfter=14,
    )
    styles["TitleSub"] = ParagraphStyle(
        "TitleSub",
        parent=base,
        fontName=body_font,
        fontSize=13,
        leading=18,
        textColor=MUTED,
        spaceAfter=4,
    )
    styles["TitleMeta"] = ParagraphStyle(
        "TitleMeta",
        parent=base,
        fontName=body_font,
        fontSize=10,
        leading=14,
        textColor=MUTED,
    )
    styles["TableCell"] = ParagraphStyle(
        "TableCell",
        parent=base,
        fontName=body_font,
        fontSize=9.5,
        leading=13,
        textColor=INK_2,
    )
    styles["TableHeader"] = ParagraphStyle(
        "TableHeader",
        parent=base,
        fontName=body_bold,
        fontSize=9.5,
        leading=13,
        textColor=INK,
    )
    styles["BodyList"] = ParagraphStyle(
        "BodyList",
        parent=styles["Body"],
        spaceBefore=0,
        spaceAfter=2,
    )

    return styles


STYLES = make_styles()


# ── Inline HTML → reportlab inline markup ──────────────────────────────────


_INLINE_MAP = [
    ("strong", "<b>", "</b>"),
    ("b", "<b>", "</b>"),
    ("em", "<i>", "</i>"),
    ("i", "<i>", "</i>"),
]


def inline_html(node) -> str:
    """Walk a BeautifulSoup node's children and emit reportlab-friendly HTML."""
    out: list[str] = []
    if isinstance(node, NavigableString):
        return _escape(str(node))
    for child in node.children:
        if isinstance(child, NavigableString):
            out.append(_escape(str(child)))
            continue
        name = child.name
        if name == "br":
            out.append("<br/>")
        elif name == "code":
            text = _escape(child.get_text())
            out.append(f'<font face="Courier" size="9.5">{text}</font>')
        elif name == "a":
            href = child.get("href", "")
            inner = inline_html(child)
            if href:
                out.append(f'<link href="{_escape(href)}" color="#1d4ed8">{inner}</link>')
            else:
                out.append(inner)
        elif name in ("strong", "b"):
            out.append(f"<b>{inline_html(child)}</b>")
        elif name in ("em", "i"):
            out.append(f"<i>{inline_html(child)}</i>")
        elif name == "u":
            out.append(f"<u>{inline_html(child)}</u>")
        elif name == "del" or name == "s" or name == "strike":
            out.append(f"<strike>{inline_html(child)}</strike>")
        else:
            out.append(inline_html(child))
    return "".join(out)


def _escape(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


# ── Block-level walker ─────────────────────────────────────────────────────


def render_block(node, flow: list, in_list: bool = False) -> None:
    """Append flowables for one block-level node."""
    name = node.name

    if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
        # h1 is the doc title — already rendered via title page; skip.
        if name == "h1":
            return
        style_key = {"h2": "H2", "h3": "H3", "h4": "H4", "h5": "H4", "h6": "H4"}[name]
        flow.append(Paragraph(inline_html(node), STYLES[style_key]))
        return

    if name == "p":
        text = inline_html(node).strip()
        if text:
            flow.append(Paragraph(text, STYLES["BodyTight" if in_list else "Body"]))
        return

    if name == "ul":
        items = []
        for li in node.find_all("li", recursive=False):
            items.append(_render_list_item(li))
        flow.append(
            ListFlowable(
                items,
                bulletType="bullet",
                start="•",
                leftIndent=14,
                bulletFontName="Helvetica",
                bulletFontSize=8,
                bulletColor=MUTED,
                spaceBefore=4,
                spaceAfter=8,
            )
        )
        return

    if name == "ol":
        items = []
        for li in node.find_all("li", recursive=False):
            items.append(_render_list_item(li))
        flow.append(
            ListFlowable(
                items,
                bulletType="1",
                leftIndent=18,
                bulletFontName="Helvetica-Bold",
                bulletFontSize=10,
                bulletColor=INK,
                spaceBefore=4,
                spaceAfter=8,
            )
        )
        return

    if name == "blockquote":
        children = list(node.find_all(["p", "ul", "ol"], recursive=False))
        if not children:
            text = inline_html(node).strip()
            if text:
                flow.append(Paragraph(text, STYLES["Quote"]))
            return
        for child in children:
            if child.name == "p":
                text = inline_html(child).strip()
                if text:
                    flow.append(Paragraph(text, STYLES["Quote"]))
            else:
                # nested list inside blockquote — render with a small indent
                render_block(child, flow)
        return

    if name == "pre":
        code = node.get_text()
        flow.append(Preformatted(code.rstrip(), STYLES["Code"]))
        return

    if name == "hr":
        flow.append(Spacer(1, 4))
        flow.append(HRFlowable(width="100%", thickness=0.4, color=RULE))
        flow.append(Spacer(1, 8))
        return

    if name == "table":
        flow.append(_render_table(node))
        flow.append(Spacer(1, 8))
        return

    if name in ("div", "section", "article", "main"):
        for child in node.children:
            if getattr(child, "name", None):
                render_block(child, flow)
        return

    # Fallback: treat as inline paragraph
    text = inline_html(node).strip()
    if text:
        flow.append(Paragraph(text, STYLES["Body"]))


def _render_list_item(li) -> ListItem:
    """Render a single <li> — collects nested paragraphs and sublists."""
    inner: list = []
    direct_text = ""
    for child in li.children:
        if isinstance(child, NavigableString):
            direct_text += str(child)
            continue
        if child.name in ("ul", "ol"):
            if direct_text.strip():
                inner.append(Paragraph(_escape(direct_text.strip()), STYLES["BodyList"]))
                direct_text = ""
            render_block(child, inner, in_list=True)
        elif child.name == "p":
            text = inline_html(child).strip()
            if text:
                inner.append(Paragraph(text, STYLES["BodyList"]))
        elif child.name == "blockquote":
            render_block(child, inner)
        else:
            direct_text += inline_html(child)
    if direct_text.strip():
        inner.insert(
            0,
            Paragraph(direct_text.strip(), STYLES["BodyList"]),
        )
    if not inner:
        inner = [Paragraph("&nbsp;", STYLES["BodyList"])]
    return ListItem(inner, leftIndent=0, spaceBefore=1, spaceAfter=1, value=None)


def _render_table(node) -> Table:
    rows: list[list[Paragraph]] = []
    has_header = bool(node.find("thead"))

    head = node.find("thead")
    body = node.find("tbody")

    if head:
        for tr in head.find_all("tr"):
            cells = [
                Paragraph(inline_html(td), STYLES["TableHeader"])
                for td in tr.find_all(["th", "td"])
            ]
            rows.append(cells)
    if body:
        for tr in body.find_all("tr"):
            cells = [
                Paragraph(inline_html(td), STYLES["TableCell"])
                for td in tr.find_all(["td", "th"])
            ]
            rows.append(cells)
    elif not head:
        # Plain table without thead/tbody
        for tr in node.find_all("tr"):
            cells = [
                Paragraph(inline_html(td), STYLES["TableCell"])
                for td in tr.find_all(["td", "th"])
            ]
            rows.append(cells)
        if rows:
            # First row likely a header
            has_header = True

    if not rows:
        return Spacer(1, 0)

    col_count = max(len(r) for r in rows)
    # Pad short rows
    for r in rows:
        while len(r) < col_count:
            r.append(Paragraph("", STYLES["TableCell"]))

    avail_width = LETTER[0] - 1.5 * inch
    col_width = avail_width / col_count

    table = Table(rows, colWidths=[col_width] * col_count, hAlign="LEFT", repeatRows=1 if has_header else 0)
    style_cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, RULE),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, INK),
    ]
    if has_header:
        style_cmds.extend([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f1ea")),
            ("LINEBELOW", (0, 0), (-1, 0), 0.8, INK),
        ])
    table.setStyle(TableStyle(style_cmds))
    return table


# ── Page layout ─────────────────────────────────────────────────────────────


class _DocState:
    def __init__(self, full_title: str):
        self.full_title = full_title


def _draw_chrome(canvas, doc, state: _DocState) -> None:
    canvas.saveState()
    width, height = LETTER

    # Skip chrome on the title page (page 1)
    if doc.page <= 1:
        canvas.restoreState()
        return

    # Header rule + small running title
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.4)
    canvas.line(0.75 * inch, height - 0.55 * inch, width - 0.75 * inch, height - 0.55 * inch)
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.75 * inch, height - 0.42 * inch, state.full_title)

    # Footer: page number
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(MUTED)
    page_text = f"Page {doc.page}"
    canvas.drawRightString(width - 0.75 * inch, 0.45 * inch, page_text)
    canvas.drawString(0.75 * inch, 0.45 * inch, "Bitsy")

    canvas.restoreState()


def build_pdf(
    output_path: Path,
    sections: list[dict],
    cover_title: str,
    cover_subtitle: str | None = None,
) -> None:
    """Build a PDF with a cover page + each section's title + flowables.

    sections: [{"title": str, "subtitle": str | None, "flowables": [...] }]
    """
    state = _DocState(cover_title)
    doc = BaseDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.85 * inch,
        rightMargin=0.85 * inch,
        topMargin=0.85 * inch,
        bottomMargin=0.85 * inch,
        title=cover_title,
        author="Bitsy",
    )
    frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="content",
    )
    template = PageTemplate(
        id="main",
        frames=[frame],
        onPage=lambda c, d: _draw_chrome(c, d, state),
    )
    doc.addPageTemplates([template])

    flow: list = []
    flow.extend(_cover_flowables(cover_title, cover_subtitle))

    for idx, section in enumerate(sections):
        if idx == 0 and len(sections) == 1:
            # Single-document PDF: cover already named the doc; skip section title.
            pass
        else:
            flow.append(PageBreak())
            flow.extend(_section_title(section["title"], section.get("subtitle")))
        flow.extend(section["flowables"])

    doc.build(flow)


def _cover_flowables(title: str, subtitle: str | None) -> list:
    today = date.today().strftime("%B %Y").upper()
    out: list = [
        Spacer(1, 1.6 * inch),
        Paragraph("BITSY", STYLES["TitleMeta"]),
        Spacer(1, 0.18 * inch),
        Paragraph(title, STYLES["TitleBig"]),
    ]
    if subtitle:
        out.append(Paragraph(subtitle, STYLES["TitleSub"]))
    out.extend([
        Spacer(1, 0.45 * inch),
        HRFlowable(width="40%", thickness=0.6, color=INK),
        Spacer(1, 0.18 * inch),
        Paragraph(today, STYLES["TitleMeta"]),
        Paragraph("Bitsy · AI search visibility", STYLES["TitleMeta"]),
    ])
    return out


def _section_title(title: str, subtitle: str | None) -> list:
    out: list = [
        Spacer(1, 0.6 * inch),
        Paragraph(title, STYLES["TitleBig"]),
    ]
    if subtitle:
        out.append(Paragraph(subtitle, STYLES["TitleSub"]))
    out.extend([
        Spacer(1, 0.18 * inch),
        HRFlowable(width="100%", thickness=0.6, color=INK),
        Spacer(1, 0.30 * inch),
    ])
    return out


# ── Markdown → flowables ───────────────────────────────────────────────────


def md_to_flowables(md_text: str) -> list:
    """Parse markdown text and return a list of reportlab flowables."""
    html = md.markdown(
        md_text,
        extensions=["tables", "fenced_code", "sane_lists"],
    )
    soup = BeautifulSoup(html, "html.parser")
    flow: list = []
    for child in soup.children:
        if not getattr(child, "name", None):
            continue
        render_block(child, flow)
    return flow


def first_h1_text(md_text: str) -> str | None:
    match = re.search(r"^#\s+(.+?)\s*$", md_text, flags=re.MULTILINE)
    return match.group(1).strip() if match else None


# ── Driver ──────────────────────────────────────────────────────────────────


def main() -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    created: list[Path] = []

    # 1) Per-document PDFs
    for entry in DOCS:
        md_path = ROOT / entry["input"]
        out_path = PDF_DIR / entry["output"]
        if not md_path.exists():
            print(f"  [missing]{md_path}")
            continue
        text = md_path.read_text(encoding="utf-8")
        flowables = md_to_flowables(text)
        build_pdf(
            out_path,
            sections=[{"title": entry["title"], "subtitle": entry.get("subtitle"), "flowables": flowables}],
            cover_title=entry["title"],
            cover_subtitle=entry.get("subtitle"),
        )
        created.append(out_path)
        print(f"  [ok]{out_path.name}")

    # 2) Combined PDF
    sections: list[dict] = []
    for entry in DOCS:
        md_path = ROOT / entry["input"]
        if not md_path.exists():
            continue
        text = md_path.read_text(encoding="utf-8")
        sections.append({
            "title": entry["title"],
            "subtitle": entry.get("subtitle"),
            "flowables": md_to_flowables(text),
        })

    combined_path = PDF_DIR / COMBINED_OUTPUT
    build_pdf(
        combined_path,
        sections=sections,
        cover_title=COMBINED_TITLE,
        cover_subtitle=COMBINED_SUBTITLE,
    )
    created.append(combined_path)
    print(f"  [ok]{combined_path.name}")

    print(f"\nWrote {len(created)} PDFs to {PDF_DIR}")


if __name__ == "__main__":
    main()
