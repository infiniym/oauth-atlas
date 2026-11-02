"""Render the short product overview; requires reportlab (authoring only)."""
from html import escape
from pathlib import Path
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/SUBMISSION-OVERVIEW.md"
OUTPUT = ROOT / "output/pdf/oauth-launch-advisor-overview-draft.pdf"


def inline(text):
    text = escape(text).replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return re.sub(
        r"\[([^\]]+)\]\((https://[^\s)]+)\)",
        r'<link href="\2" color="#245D4C"><u>\1</u></link>',
        text,
    )


ink = colors.HexColor("#1D3029")
muted = colors.HexColor("#52645D")
styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=25,
                            leading=29, textColor=ink, spaceAfter=9),
    "deck": ParagraphStyle("deck", fontName="Helvetica", fontSize=11.5,
                           leading=16, textColor=muted, spaceAfter=10),
    "links": ParagraphStyle("links", fontName="Helvetica", fontSize=9.5,
                            leading=13, spaceAfter=10),
    "heading": ParagraphStyle("heading", fontName="Helvetica-Bold", fontSize=11,
                              leading=15, textColor=ink, spaceBefore=11, spaceAfter=5),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.2,
                           leading=14.3, textColor=ink, spaceAfter=6),
    "step": ParagraphStyle("step", fontName="Helvetica", fontSize=10.2,
                           leading=14.3, textColor=ink, spaceAfter=5,
                           leftIndent=14, firstLineIndent=-14),
}

story = []
for paragraph in SOURCE.read_text().strip().split("\n\n"):
    if paragraph.startswith("# "):
        story.append(Paragraph(inline(paragraph[2:]), styles["title"]))
    elif paragraph.startswith("## "):
        story.append(Paragraph(inline(paragraph[3:]), styles["heading"]))
    elif re.match(r"\d+\. ", paragraph):
        for line in paragraph.splitlines():
            story.append(Paragraph(inline(line), styles["step"]))
    else:
        kind = "links" if paragraph.startswith("[Demo]") else "deck" if len(story) == 1 else "body"
        story.append(Paragraph(inline(paragraph.replace("\n", " ")), styles[kind]))

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, rightMargin=48, leftMargin=48,
    topMargin=40, bottomMargin=40,
    title="OAuth Launch Advisor", author="OAuth Launch Advisor",
)
doc.build(story)
print(OUTPUT)
