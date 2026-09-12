"""Branded DOCX for SMM take-home and monthly appraisal."""
import sys
from pathlib import Path
from shutil import copyfile

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

PURPLE = RGBColor(0x8D, 0x40, 0x87)
INK = RGBColor(0x1F, 0x1F, 0x1F)
MUTED = RGBColor(0x5F, 0x5F, 0x5F)
SOFT = "F8F3F8"
ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "brand" / "afrivate-logo-long-purple.png"
DOWNLOADS = Path(r"C:\Users\DELL\Downloads")


def set_run(run, *, size=11, bold=False, color=INK, all_caps=False):
    run.font.name = "Calibri"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color
    run.font.all_caps = all_caps


def shade_cell(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tcPr.append(shd)


def no_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tblPr.append(borders)


def add_bottom_border(paragraph, color, size):
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), str(size))
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    paragraph._p.get_or_add_pPr().append(pBdr)


def para(doc, text, *, size=11, bold=False, color=INK, space_after=8, space_before=0, align="left", all_caps=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.line_spacing = 1.15
    if align == "center":
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=color, all_caps=all_caps)
    return p


def heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    add_bottom_border(p, "EBDCEB", "6")
    run = p.add_run(text)
    set_run(run, size=11, bold=True, color=PURPLE, all_caps=True)
    return p


def bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.clear()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run(run, size=11)
    return p


def kv_table(doc, rows):
    mt = doc.add_table(rows=len(rows), cols=2)
    no_table_borders(mt)
    for i, (k, v) in enumerate(rows):
        a, b = mt.rows[i].cells
        shade_cell(a, SOFT)
        shade_cell(b, SOFT)
        pa = a.paragraphs[0]
        pa.paragraph_format.space_after = Pt(2)
        pa.paragraph_format.space_before = Pt(2)
        set_run(pa.add_run(k), size=10, bold=True)
        pb = b.paragraphs[0]
        pb.paragraph_format.space_after = Pt(2)
        pb.paragraph_format.space_before = Pt(2)
        set_run(pb.add_run(v), size=10, color=MUTED)
    return mt


def data_table(doc, headers, rows):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    for i, h in enumerate(headers):
        shade_cell(t.rows[0].cells[i], SOFT)
        set_run(t.rows[0].cells[i].paragraphs[0].add_run(h), size=9, bold=True, color=PURPLE, all_caps=True)
    for ri, row in enumerate(rows, start=1):
        for ci, val in enumerate(row):
            set_run(t.rows[ri].cells[ci].paragraphs[0].add_run(val), size=10)
    return t


def brand_header(doc, footer_text):
    for section in doc.sections:
        section.top_margin = Cm(1.6)
        section.bottom_margin = Cm(1.8)
        section.left_margin = Cm(1.8)
        section.right_margin = Cm(1.8)
        footer = section.footer
        footer.is_linked_to_previous = False
        fp = footer.paragraphs[0]
        r = fp.add_run(footer_text)
        set_run(r, size=8, color=MUTED)
    header = doc.add_table(rows=1, cols=2)
    no_table_borders(header)
    c0, c1 = header.rows[0].cells
    c0.paragraphs[0].add_run().add_picture(str(LOGO), width=Inches(1.7))
    for i, line in enumerate(["Official Document", "AfriVate Technologies Ltd", "RC: 9210092"]):
        target = c1.paragraphs[0] if i == 0 else c1.add_paragraph()
        target.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        target.paragraph_format.space_after = Pt(0)
        target.paragraph_format.space_before = Pt(0)
        set_run(target.add_run(line), size=9, color=MUTED)
    rule = doc.add_paragraph()
    rule.paragraph_format.space_before = Pt(4)
    rule.paragraph_format.space_after = Pt(10)
    add_bottom_border(rule, "8D4087", "18")


def write_smm():
    doc = Document()
    brand_header(doc, "hr@afrivate.org  ·  AFRI-SMM-EX-01          AfriVate Technologies Ltd  ·  RC: 9210092")
    para(doc, "Social Media Manager & Content Creator — Take-Home Exercise", size=16, bold=True, align="center", space_after=12, all_caps=True)
    kv_table(doc, [
        ("Document Code", "AFRI-SMM-EX-01"),
        ("Status", "Hiring exercise — not a policy"),
        ("Suggested time", "3–4 hours (guideline, not a strict cap)"),
        ("Deadline", "Within 24 hours of receiving this exercise"),
        ("Submit to", "afrivatehr@gmail.com"),
        ("Subject line", "SMM TAKE-HOME — [YOUR FULL NAME]"),
    ])
    para(doc, "Thank you for your interest in the Social Media Manager & Content Creator role at AfriVate Technologies Ltd. This exercise is designed to give us a realistic picture of how you think, plan, create, and make decisions — not only how much content you can produce.", space_before=12)
    para(doc, "We are not evaluating how much content you can produce. We are evaluating thinking, creativity, strategic judgement, understanding of digital audiences, and the ability to turn ideas into effective content.", size=10, color=MUTED)

    heading(doc, "1. About AfriVate")
    para(doc, "AfriVate Technologies Ltd builds platforms and programmes that connect African Pathfinders (talent) with Enablers (organisations) through volunteering, internships, mentorship, micro-tasks, remote work, and related opportunities — elevating life and professional growth across Africa.")
    para(doc, "Our mission is practical: create technology and operating systems that improve how African talent is discovered, developed, and connected to opportunity. Our audience is largely young, digitally engaged, ambitious, and proud of African identity and progress.")
    bullet(doc, "Innovation · Elevation · Technology — the AfriVate tagline.")
    bullet(doc, "Excellence: work meets stated success criteria. Completion without quality is not success.")
    bullet(doc, "Ownership: outcomes, communication, and accurate reporting — not only effort.")
    bullet(doc, "Professionalism: clear, respectful, and specific. Avoid hype AfriVate cannot stand behind.")
    para(doc, "Visual identity is purple-led (#8d4087), clean, and modern. Content should feel African, ambitious, and useful.")

    heading(doc, "2. What we are evaluating")
    data_table(doc, ["Criterion", "Weight"], [
        ["Content strategy", "20%"],
        ["Creativity and originality", "15%"],
        ["Content execution", "20%"],
        ["Copywriting and communication", "15%"],
        ["Analytics and decision-making", "15%"],
        ["Community-building thinking", "10%"],
        ["Attention to detail", "5%"],
    ])

    heading(doc, "3. Part 1 — Social media strategy")
    para(doc, "Develop a short social media strategy for AfriVate that includes:")
    for item in ["3–4 content pillars", "Target audience for each pillar (or overall)", "Purpose of each pillar", "Recommended platforms and why they fit", "What AfriVate should be known for online"]:
        bullet(doc, item)

    heading(doc, "4. Part 2 — 4-day content calendar")
    para(doc, "Build a 4-day content calendar. Official work days are Monday to Thursday; say which calendar you chose. For each day include: date, platform, format, topic, hook, caption/concept, objective, and CTA. A table is preferred.")

    heading(doc, "5. Part 3 — Create actual content")
    para(doc, "We evaluate concept and thinking, not design polish. Wireframes or sketches are acceptable.")
    para(doc, "5.1 Instagram / LinkedIn carousel — Topic: “5 Ways Technology Can Improve Everyday Life in Africa”. Include slides plus caption.", bold=True, size=11)
    para(doc, "5.2 Short-form video concept — 30–60 second Reel / TikTok / Short explaining AfriVate or a core value. Submit a script and shot list, or a finished video.", bold=True, size=11)

    heading(doc, "6. Part 4 — Copywriting")
    para(doc, "Sample announcement: “AfriVate is opening a new Pathfinder intake — volunteering, internship, mentorship, and remote-work opportunities with Enablers building tech solutions to everyday problems across Africa.”")
    para(doc, "Write a LinkedIn caption, an Instagram caption, and a strong CTA.")

    heading(doc, "7. Part 5 — Analytics and decision-making")
    data_table(doc, ["Content", "Reach", "Engagement", "Shares", "Saves"], [
        ["Founder video", "4,800", "420", "86", "51"],
        ["Educational carousel", "7,200", "690", "142", "183"],
        ["Company announcement", "3,100", "180", "21", "12"],
        ["Team / people post", "5,600", "510", "97", "74"],
    ])
    para(doc, "Which content would you produce more of, and why? Which would you change or discontinue? What do the numbers suggest about the audience? What would you test over the next 30 days?", space_before=8)

    heading(doc, "8. Part 6 — Community building")
    para(doc, "Propose three practical ways you would grow and engage a community of young Africans interested in technology, innovation, digital careers, and African solutions over the next 30 days.")

    heading(doc, "9. Submission")
    bullet(doc, "Combine Parts 1, 2, 4, 5, and 6 into one PDF or Word document, labelled by section.")
    bullet(doc, "Part 3 can sit in the same document or as separate files.")
    bullet(doc, "Name files clearly, for example Ada_Okeke_AfriVate_SMM_Exercise.pdf.")
    bullet(doc, "Submit within 24 hours to afrivatehr@gmail.com with subject SMM TAKE-HOME — [YOUR FULL NAME].")
    para(doc, "If you have questions, email afrivatehr@gmail.com — we would rather you ask than guess. We’re excited to see how you think. Good luck.")
    para(doc, "Document Code AFRI-SMM-EX-01 · Hiring exercise (not a policy) · Owner: People & Culture / Brand & Communications", size=9, color=MUTED, space_before=16)

    out_dir = ROOT / "hiring" / "exercises"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "Afrivate-SMM-Take-Home-Exercise.docx"
    doc.save(out)
    copyfile(out, DOWNLOADS / "Afrivate SMM Take-Home Exercise.docx")
    print("saved", out)


def blank_row(table, cols, height_hint=False):
    cells = table.add_row().cells if False else None
    return cells


def write_monthly():
    doc = Document()
    brand_header(doc, "afrivatehr@gmail.com  ·  AFRI-MPA-01          AfriVate Technologies Ltd  ·  RC: 9210092")
    para(doc, "Monthly Performance Appraisal Form", size=16, bold=True, align="center", space_after=2, all_caps=True)
    para(doc, "For Team Leads — monthly performance tracking, coaching and development", size=10, color=MUTED, align="center", space_after=12)
    kv_table(doc, [
        ("Document Code", "AFRI-MPA-01"),
        ("Status", "Official form — not a policy"),
        ("Cadence", "Monthly; feeds into AFRI-PAF-01"),
        ("Effective Date", "8 September 2026"),
        ("Owner", "People & Culture"),
    ])
    para(doc, "Complete this form in a live monthly discussion. The Team Member completes Section A first. The Team Lead completes Sections B and C. Record the outcome in the AfriVate Portal where the workflow exists. Slack coordinates; it does not replace the Portal record. Monthly reviews feed into — but do not replace — the formal appraisal (AFRI-PAF-01). This form does not create employment or any right to pay. “Employee” in any older wording means Team Member.", space_before=12)

    heading(doc, "Section A — Recorded by the Team Member")
    kv_table(doc, [
        ("Team Member name", ""),
        ("Role / position", ""),
        ("Department / team", ""),
        ("Month of review", ""),
        ("Team Lead / reviewer", ""),
    ])
    para(doc, "Task summary for the month", bold=True, space_before=10, space_after=6)
    data_table(doc, ["Task(s) for the month", "Actual result", "Team Member comment"], [["", "", ""], ["", "", ""], ["", "", ""]])
    para(doc, "Support needed — What would help you perform better next month?", bold=True, space_before=10)
    para(doc, "_" * 92, color=MUTED)
    para(doc, "_" * 92, color=MUTED)

    heading(doc, "Section B — Recorded by the Team Lead / reviewer")
    para(doc, "Reviewer comment / recommendation", bold=True)
    para(doc, "_" * 92, color=MUTED)
    para(doc, "_" * 92, color=MUTED)
    para(doc, "KPI alignment check — Are this month’s KPIs aligned with upcoming formal appraisal KPIs?", bold=True, space_before=8)
    para(doc, "☐  Fully aligned          ☐  Partially aligned          ☐  Not aligned")
    para(doc, "Areas for improvement", bold=True, space_before=8)
    para(doc, "_" * 92, color=MUTED)
    para(doc, "Training needs", bold=True, space_before=8)
    para(doc, "_" * 92, color=MUTED)

    heading(doc, "Section C — Performance rating (out of 45)")
    para(doc, "Task execution / delivery — To what extent did the Team Member deliver on what they set out to do this month? Score out of 10.")
    data_table(doc, ["Category", "Score (out of 10)"], [["Task execution / delivery", ""]])
    para(doc, "Behavioural skill and cultural fit — Score each category from 1–5. Subtotal is out of 35.", space_before=8)
    data_table(doc, ["Rating category", "Score (1–5)"], [
        ["Ownership and leadership", ""],
        ["Professionalism", ""],
        ["Respect", ""],
        ["Initiative", ""],
        ["Communication", ""],
        ["Teamwork / reliability", ""],
        ["Excellence / work quality", ""],
        ["SUBTOTAL (out of 35)", ""],
        ["GRAND TOTAL (out of 45)", ""],
    ])
    para(doc, "Tick the score band that applies this month:", bold=True, space_before=10)
    data_table(doc, ["Tick", "Band", "Score"], [
        ["☐", "Exceeds expectations", "36–45"],
        ["☐", "Meets expectations", "27–35"],
        ["☐", "Needs improvement plan", "20–26"],
        ["☐", "Below expectations", "12–19"],
        ["☐", "Unsatisfactory", "0–11"],
    ])
    para(doc, "Selected band: ________________________________", space_before=8)
    para(doc, "People & Culture note: Monthly scores are for tracking, coaching, and development. They do not directly trigger termination, but may inform AFRI-PAF-01 and AFRI-PDP-01. Two consecutive months in Below Expectations or Unsatisfactory should be referred to People & Culture for a possible PIP.", size=10, color=MUTED, space_before=8)
    para(doc, "Team Member signature & date: ______________________          Team Lead signature & date: ______________________", space_before=16)
    para(doc, "Document Code AFRI-MPA-01 · Related: AFRI-PAF-01 · AFRI-SWP · AFRI-PDP-01 · AFRI-TLOP-01", size=9, color=MUTED, space_before=16)

    out_dir = ROOT / "policies"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "Afrivate-Monthly-Performance-Appraisal.docx"
    doc.save(out)
    copyfile(out, DOWNLOADS / "Afrivate Monthly Performance Appraisal.docx")
    print("saved", out)


target = sys.argv[1] if len(sys.argv) > 1 else None
if target == "monthly":
    write_monthly()
elif target == "smm":
    write_smm()
elif target is None:
    write_smm()
    write_monthly()
else:
    raise SystemExit(f'Unknown target "{target}". Use monthly or smm.')
