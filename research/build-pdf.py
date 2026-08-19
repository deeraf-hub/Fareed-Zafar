# -*- coding: utf-8 -*-
"""Build a structured PDF from the prospect CSV + outreach playbook."""
import csv, re, os
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, NextPageTemplate,
                                PageBreak, KeepTogether, HRFlowable)

SRC = "/home/user/Fareed-Zafar/research"
OUT = os.path.join(SRC, "Prospect-Outreach-Pack.pdf")

# ---------------------------------------------------------------- palette
INK      = colors.HexColor("#16243D")
INK_SOFT = colors.HexColor("#33415C")
MUTED    = colors.HexColor("#64748B")
FAINT    = colors.HexColor("#94A3B8")
ACCENT   = colors.HexColor("#B45309")
ACCENT_L = colors.HexColor("#FEF3C7")
RULE     = colors.HexColor("#D8DEE8")
BAND     = colors.HexColor("#F1F4F9")
BAND_2   = colors.HexColor("#FAFBFD")
WHITE    = colors.white
GREEN    = colors.HexColor("#166534")
GREEN_L  = colors.HexColor("#DCFCE7")

PRIO = {
    "High":   (ACCENT,  ACCENT_L, "HIGH"),
    "Medium": (INK_SOFT, BAND,    "MED"),
    "Low":    (FAINT,   BAND_2,   "LOW"),
}

# ------------------------------------------------------- text sanitising
# ReportLab base-14 fonts use WinAnsi; map anything outside it.
SUBS = {
    "—": "—", "–": "–",       # em/en dash are in WinAnsi
    "→": " > ", "←": " < ", "≥": ">=", "≤": "<=",
    "•": "•", " ": " ",
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "₹": "Rs.", "…": "...",
}
ALLOWED = set(range(0x20, 0x7f)) | {0x91,0x92,0x93,0x94,0x95,0x96,0x97,0x80}

def clean(s):
    if s is None:
        return ""
    for k, v in SUBS.items():
        s = s.replace(k, v)
    out = []
    for ch in s:
        o = ord(ch)
        if o < 0x80 or 0xa0 <= o <= 0xff or o in (0x2014, 0x2013, 0x2022, 0x20ac):
            out.append(ch)
        elif o in ALLOWED:
            out.append(ch)
        else:
            out.append("")
    return "".join(out)

def esc(s):
    return clean(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def rich(s):
    """Escape, then convert **bold** markers to <b> tags."""
    s = esc(s)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)

# ------------------------------------------------------------- styles
def S(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9.5, leading=13.5,
                textColor=INK_SOFT, alignment=TA_LEFT, spaceAfter=0)
    base.update(kw)
    return ParagraphStyle(name, **base)

st = {
    "cover_kicker": S("ck", fontName="Helvetica-Bold", fontSize=10, leading=14,
                      textColor=ACCENT, spaceAfter=10),
    "cover_title":  S("ct", fontName="Helvetica-Bold", fontSize=33, leading=38,
                      textColor=INK, spaceAfter=12),
    "cover_sub":    S("cs", fontSize=13, leading=19, textColor=MUTED, spaceAfter=6),
    "h1":           S("h1", fontName="Helvetica-Bold", fontSize=19, leading=23,
                      textColor=INK, spaceAfter=4),
    "h1sub":        S("h1s", fontSize=10, leading=14, textColor=MUTED, spaceAfter=14),
    "h2":           S("h2", fontName="Helvetica-Bold", fontSize=13, leading=17,
                      textColor=INK, spaceAfter=6),
    "h3":           S("h3", fontName="Helvetica-Bold", fontSize=10.5, leading=14,
                      textColor=ACCENT, spaceAfter=4),
    "body":         S("bd", spaceAfter=8),
    "body_tight":   S("bt", spaceAfter=4),
    "lead":         S("ld", fontSize=10.5, leading=15.5, textColor=INK_SOFT, spaceAfter=10),
    "note":         S("nt", fontSize=8.8, leading=12.5, textColor=MUTED, spaceAfter=6),
    "cell":         S("cl", fontSize=8.6, leading=11.4),
    "cell_sm":      S("cs2", fontSize=7.6, leading=10, textColor=MUTED),
    "cell_hd":      S("ch", fontName="Helvetica-Bold", fontSize=8, leading=10.5,
                      textColor=WHITE),
    "tcell":        S("tc", fontSize=7.6, leading=9.9),
    "tcell_b":      S("tcb", fontName="Helvetica-Bold", fontSize=8, leading=10.2,
                      textColor=INK),
    "tcell_sm":     S("tcs", fontSize=6.8, leading=8.8, textColor=MUTED),
    "tcell_c":      S("tcc", fontSize=7.4, leading=9.6, alignment=TA_CENTER),
    "mono":         S("mn", fontName="Courier", fontSize=8.2, leading=12,
                      textColor=INK_SOFT),
    "quote":        S("qt", fontName="Helvetica-Oblique", fontSize=9.2, leading=13,
                      textColor=INK_SOFT),
    "toc":          S("tc3", fontSize=10, leading=17, textColor=INK_SOFT),
}

# ------------------------------------------------------- doc template
class Doc(BaseDocTemplate):
    def __init__(self, path):
        BaseDocTemplate.__init__(self, path, pagesize=letter,
                                 leftMargin=0.85*inch, rightMargin=0.85*inch,
                                 topMargin=0.85*inch, bottomMargin=0.8*inch,
                                 title="Prospect Outreach Pack",
                                 author="Fareed Zafar",
                                 subject="Top 100 prospects for presentation design outreach")
        pw, ph = letter
        lw, lh = landscape(letter)
        self.addPageTemplates([
            PageTemplate(id="cover", pagesize=letter,
                         frames=[Frame(0.85*inch, 0.8*inch, pw-1.7*inch, ph-1.65*inch, id="cf")],
                         onPage=self._cover_page),
            PageTemplate(id="portrait", pagesize=letter,
                         frames=[Frame(0.85*inch, 0.8*inch, pw-1.7*inch, ph-1.7*inch, id="pf")],
                         onPage=lambda c, d, sz=letter, m=0.85*inch: self._chrome(c, d, sz, m)),
            PageTemplate(id="landscape", pagesize=landscape(letter),
                         frames=[Frame(0.5*inch, 0.62*inch, lw-1.0*inch, lh-1.42*inch, id="lf")],
                         onPage=lambda c, d, sz=landscape(letter), m=0.5*inch: self._chrome(c, d, sz, m)),
        ])
        self.section = "Prospect Outreach Pack"

    def _cover_page(self, canvas, doc):
        canvas.saveState()
        pw, ph = letter
        canvas.setFillColor(INK)
        canvas.rect(0, ph-1.15*inch, pw, 1.15*inch, stroke=0, fill=1)
        canvas.setFillColor(ACCENT)
        canvas.rect(0, ph-1.21*inch, pw, 0.06*inch, stroke=0, fill=1)
        canvas.setFillColor(INK)
        canvas.rect(0, 0, pw, 0.42*inch, stroke=0, fill=1)
        canvas.setFillColor(WHITE)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(0.85*inch, 0.17*inch, "Compiled 18 August 2026")
        canvas.drawRightString(pw-0.85*inch, 0.17*inch,
                               "Every prospect carries a dated, sourced buying trigger")
        canvas.restoreState()

    def _chrome(self, canvas, doc, pagesize, m):
        canvas.saveState()
        pw, ph = pagesize
        # header
        canvas.setStrokeColor(RULE); canvas.setLineWidth(0.6)
        canvas.line(m, ph-0.6*inch, pw-m, ph-0.6*inch)
        canvas.setFillColor(FAINT); canvas.setFont("Helvetica", 7.5)
        canvas.drawString(m, ph-0.52*inch, clean(self.section).upper())
        canvas.drawRightString(pw-m, ph-0.52*inch, "PROSPECT OUTREACH PACK")
        # footer
        canvas.setStrokeColor(RULE)
        canvas.line(m, 0.52*inch, pw-m, 0.52*inch)
        canvas.setFillColor(FAINT); canvas.setFont("Helvetica", 7.5)
        canvas.drawString(m, 0.36*inch, "Re-verify every trigger before you send")
        canvas.setFillColor(MUTED); canvas.setFont("Helvetica-Bold", 8)
        canvas.drawRightString(pw-m, 0.36*inch, str(doc.page))
        canvas.restoreState()

def new_page(name):
    """Switch the running header, then break. Order matters: onPage fires at
    page start, so the marker must draw on the page *before* the break."""
    return [set_section(name), PageBreak()]

def set_section(name):
    class _Marker(Spacer):
        def draw(self):
            self._doctemplate.section = name
    return _Marker(1, 0)

# ------------------------------------------------------- table helpers
def hdr_row(labels):
    return [Paragraph(esc(l), st["cell_hd"]) for l in labels]

def base_table_style(ncols, header=True, zebra_from=1):
    cmds = [
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LINEBELOW", (0,0), (-1,-2), 0.4, RULE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
        ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0,0), (-1,0), INK),
            ("TOPPADDING", (0,0), (-1,0), 6),
            ("BOTTOMPADDING", (0,0), (-1,0), 6),
            ("LINEBELOW", (0,0), (-1,0), 0, INK),
        ]
    return cmds

def simple_table(rows, widths, align_center=()):
    data = [hdr_row(rows[0])]
    for r in rows[1:]:
        data.append([Paragraph(rich(c), st["cell"]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    cmds = base_table_style(len(widths))
    for i in range(2, len(data), 2):
        cmds.append(("BACKGROUND", (0,i), (-1,i), BAND_2))
    for c in align_center:
        cmds.append(("ALIGN", (c,0), (c,-1), "CENTER"))
    t.setStyle(TableStyle(cmds))
    return t

def callout(title, body, tone="accent"):
    fg, bg = (ACCENT, ACCENT_L) if tone == "accent" else (GREEN, GREEN_L)
    inner = []
    if title:
        inner.append(Paragraph(esc(title), S("cot", fontName="Helvetica-Bold",
                                             fontSize=9.5, leading=13, textColor=fg,
                                             spaceAfter=3)))
    inner.append(Paragraph(rich(body), S("cob", fontSize=9, leading=12.8,
                                         textColor=INK_SOFT)))
    t = Table([[inner]], colWidths=[6.3*inch], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("LINEBEFORE", (0,0), (0,-1), 2.5, fg),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    return t

def bullets(items, style="body_tight", width=6.3*inch):
    rows = []
    for it in items:
        rows.append([Paragraph("•", S("bl", textColor=ACCENT,
                                           fontName="Helvetica-Bold", fontSize=9.5)),
                     Paragraph(rich(it), st[style])])
    t = Table(rows, colWidths=[0.22*inch, width-0.22*inch], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 1),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING", (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ]))
    return t

def section_head(num, title, sub=""):
    els = [Paragraph(esc(("%s  " % num) + title), st["h1"])]
    if sub:
        els.append(Paragraph(rich(sub), st["h1sub"]))
    els.append(HRFlowable(width="100%", thickness=1.4, color=ACCENT,
                          spaceBefore=0, spaceAfter=12))
    return els

def mono_block(lines, width=6.3*inch):
    body = "<br/>".join(esc(l) if l else "&nbsp;" for l in lines)
    p = Paragraph(body, st["mono"])
    t = Table([[p]], colWidths=[width], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), BAND),
        ("BOX", (0,0), (-1,-1), 0.5, RULE),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 9),
        ("BOTTOMPADDING", (0,0), (-1,-1), 9),
    ]))
    return t

# ================================================================ CONTENT
story = []
A = story.append

SEGMENTS = [
    ("A", "A - Hiring signal", "Active hiring signal", 14,
     "Each of these organisations posted a job for someone to make presentations, proposals or pursuit graphics. The need is proven, the budget line exists, and nobody has to be convinced the work is worth paying for. You compete on who, not whether.",
     "Do NOT position yourself as an alternative to the hire - the hiring manager owns that requisition and reads it as a threat. Position as overflow and peak-week capacity. If the role has since been filled the angle gets stronger, not weaker: the new hire is drowning in month one."),
    ("B", "B - Agency white-label", "Agencies & studios for white-label work", 21,
     "These businesses sell decks. Their constraint is production capacity, not demand. They already brief external designers, they already have clients, and they pay without you educating anyone. One agency that adds you to its bench replaces months of cold outreach.",
     "Lead with capacity, reliability and brand discipline - your ability to work inside their templates, their client's brand and their deadlines, invisibly. Never pitch narrative or strategy: that is the margin they sell. Price per slide or per deck, never hourly."),
    ("C", "C - Funded startup", "Recently funded startups", 31,
     "Raised July-August 2026. Cash in the bank, sales motion starting, and a board that now expects a monthly update deck with real data in it.",
     "A company that just closed a round does NOT need a pitch deck - they finished that job. Sell what breaks after a raise: sales decks, one-pagers, investor-update templates, conference collateral, data visualisation. Contact within 6 weeks. Save the pitch-deck angle for the 12-18 month re-trigger."),
    ("D", "D - VC/Accelerator", "VCs, accelerators & fund managers", 10,
     "Two revenue lines from one contact. The firm needs LP decks and demo-day templates; more importantly a pre-seed partner speaks to dozens of founders a month and every one of them needs a deck.",
     "Never ask for a referral in message one - it reads as extractive. Lead by giving: offer a free teardown of one portfolio company's public deck. Useful to them either way, and it demonstrates judgement rather than claiming it."),
    ("E", "E - Events", "Events, conferences & associations", 10,
     "Every one of these publishes a sponsorship prospectus and exhibitor brochure every year, because that document is how the event gets funded. Recurring, calendar-driven, already budgeted.",
     "The 2027 prospectus is commissioned 9-12 months before the event - for most of these, now through Q4 2026. Never pitch in the six weeks before an event. Also sell the back end: the post-event sponsor recap deck that decides whether sponsors renew."),
    ("F", "F - Sports/Esports", "Sports & esports properties", 9,
     "The Esports World Cup's Club Partner Programme - $20M a year, six-figure base per club - dropped several major organisations for its 2026 edition. Those clubs just lost a guaranteed revenue line and must replace it with commercial sponsorship.",
     "Sell revenue documents: sponsorship sales decks, partnership one-pagers, audience and engagement data visualisation, renewal recap decks. Do not pitch generic brand design. Clubs newly added to the programme need activation collateral right now."),
    ("G", "G - Nonprofit", "Nonprofits & foundations", 5,
     "Annual and impact reports run on a fixed cycle, and the sector has an acknowledged quality problem: nearly four in five nonprofits use an impact report to fundraise, but only 16% say it is very effective.",
     "That 16% statistic is your entire pitch - quote it verbatim. Pitch foundations and large national organisations, not small local ones: nonprofit design averages $26.90/hr against $42.86/hr in the wider market. Scope by project, never hourly."),
]

# ------------------------------------------------------------- COVER
A(Spacer(1, 1.05*inch))
A(Paragraph("PROSPECT RESEARCH &amp; OUTREACH PACK", st["cover_kicker"]))
A(Paragraph("Top 100 Prospects for Pitch Decks, Presentation Design &amp; Sales Collateral", st["cover_title"]))
A(Spacer(1, 6))
A(HRFlowable(width="38%", thickness=2.5, color=ACCENT, spaceAfter=16))
A(Paragraph("A working directory of 100 organisations with a live, dated reason to buy presentation "
            "design - plus the playbook for turning that reason into a reply.", st["cover_sub"]))
A(Spacer(1, 30))

cover_rows = [
    ["Prepared for", "Fareed Zafar"],
    ["Compiled", "18 August 2026"],
    ["Primary channel", "LinkedIn, with email as the second touch"],
    ["Scope", "Pitch decks, presentation design, sales decks, brochures, one-pagers,\nflyers, data visualisation, sponsorship proposals"],
    ["Contents", "100 prospects across 7 segments  |  105 CRM rows  |  9-part playbook"],
]
ct = Table([[Paragraph(esc(k), S("ck2", fontName="Helvetica-Bold", fontSize=8.6,
                                 leading=12, textColor=ACCENT)),
             Paragraph(esc(v).replace("\n", "<br/>"), S("cv", fontSize=9.4, leading=13.4,
                                                        textColor=INK_SOFT))]
            for k, v in cover_rows],
           colWidths=[1.35*inch, 4.95*inch], hAlign="LEFT")
ct.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LINEBELOW", (0,0), (-1,-2), 0.4, RULE),
    ("TOPPADDING", (0,0), (-1,-1), 7),
    ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ("LEFTPADDING", (0,0), (-1,-1), 0),
]))
A(ct)
A(Spacer(1, 34))
A(callout("The one principle everything here rests on",
          "Every prospect is on this list because of a dated, public, verifiable event - a job posting, "
          "a funding round, a dropped sponsorship, a published prospectus. That event is your first line. "
          "**Never open with what you do. Open with what happened to them.**"))

A(NextPageTemplate("portrait"))
for e in new_page("Contents"):
    A(e)

# --------------------------------------------------- CONTENTS / OVERVIEW
A(Paragraph("What's in this pack", st["h1"]))
A(HRFlowable(width="100%", thickness=1.4, color=ACCENT, spaceBefore=2, spaceAfter=14))

toc_rows = [["Part", "Section", "What you use it for"]]
toc_rows += [
    ["1", "The Outreach Playbook", "Segment strategy, message templates, follow-up cadence, pricing anchors, objection handling"],
    ["2", "The Prospect Directory", "All 100 prospects grouped by segment, each with a dated trigger, what to sell and who to contact"],
    ["3", "Priority Worksheet", "The contact-this-week shortlist, pulled out and ready to work"],
]
A(simple_table(toc_rows, [0.55*inch, 1.95*inch, 3.8*inch], align_center=(0,)))
A(Spacer(1, 22))

A(Paragraph("How the 100 break down", st["h2"]))
A(Paragraph("Segments are ordered by how little convincing each one requires, so your effort follows "
            "conversion likelihood rather than list order.", st["body"]))

seg_rows = [["Seg", "Segment", "Count", "Why they're on the list", "Conversion"]]
conv = {"A": "Highest", "B": "Highest volume", "C": "Medium-high", "D": "Medium, huge upside",
        "E": "Medium", "F": "Medium-high", "G": "Medium"}
short = {
    "A": "Posted a job for a presentation or proposal designer. Budget approved.",
    "B": "Their product **is** decks. They subcontract overflow. Recurring.",
    "C": "Raised Jul-Aug 2026. Cash banked, sales motion starting.",
    "D": "Buy LP decks themselves **and** refer their whole portfolio.",
    "E": "Publish a sponsorship prospectus every single year.",
    "F": "Sponsorship decks are their revenue engine. Several just lost a partner programme.",
    "G": "Annual and impact reports on a fixed annual cycle.",
}
for code, _, name, cnt, _, _ in SEGMENTS:
    seg_rows.append([code, name, str(cnt), short[code], conv[code]])
seg_rows.append(["", "**Total**", "**100**", "", ""])
A(simple_table(seg_rows, [0.45*inch, 1.75*inch, 0.5*inch, 2.7*inch, 0.9*inch],
               align_center=(0, 2)))
A(Spacer(1, 20))

A(Paragraph("Read this before you send anything", st["h2"]))
A(bullets([
    "**Job postings expire.** Segment A triggers were live 10-18 August 2026. Re-check the posting is still up before referencing it. If it is filled, switch to the overflow angle.",
    "**No individual LinkedIn profile was verified.** Named people appear only where a public source names them. Everywhere else you get the job title to target - search that title plus the company and you will land on the right person.",
    "**Funding figures are as reported.** Amounts occasionally get restated. Never quote a number you have not re-read that morning.",
    "**Segment C moves fast.** A seed round announced in August is a hot lead in September and a cold one by December. Work it first.",
]))
for e in new_page("Part 1 - The Outreach Playbook"):
    A(e)

# ============================================ PART 1 - THE PLAYBOOK
for e in section_head("PART 1", "The Outreach Playbook",
                      "How to work the list so the reply you get is the one you expect."):
    A(e)

A(Paragraph("1.  The core principle", st["h2"]))
A(Paragraph("Every prospect here is attached to a dated, public, verifiable event. Leading with that "
            "event does three things at once: it proves you did homework, it explains why you are "
            "writing today, and it makes the message impossible to confuse with the fifty other "
            "\"I design pitch decks\" notes they got this week.", st["body"]))

dd = [["", "Don't write this", "Write this instead"]]
dd += [
    ["A", "\"Hi, I'm a presentation designer with 6 years of experience...\"",
     "\"Saw you posted a Presentation Designer role in Boston on the 12th - four days on-site is a tough ask for that skillset.\""],
    ["C", "\"I can help you with your pitch deck.\"",
     "\"Congrats on the $8M from Square Peg. The first thing that usually breaks after a seed is the sales deck.\""],
    ["B", "\"Do you outsource design work?\"",
     "\"You've got 5,000 decks shipped and a San Diego studio - do you keep a freelance bench for overflow weeks?\""],
]
A(simple_table(dd, [0.4*inch, 2.85*inch, 3.05*inch], align_center=(0,)))
A(Spacer(1, 18))

A(Paragraph("2.  Work the segments in this order", st["h2"]))
A(Paragraph("Effort follows conversion. Do not start at prospect 1 and grind to 100.", st["body"]))
order = [["Timing", "Segment", "Why now"]]
order += [
    ["Week 1-2", "**B** agencies, then **A** hiring signals",
     "Nobody here needs selling on the category. Segment B especially: a bench placement sends you work for years without another cold message. **Contact all 21 in Segment B in the first fortnight.**"],
    ["Week 3-4", "**D** VCs & accelerators",
     "Low volume, enormous leverage. You are not selling a fund a deck - you are asking to be the designer it recommends."],
    ["Week 5-8", "**C** funded startups",
     "High volume, medium conversion, fastest cash. Time-sensitive: hit them inside 6 weeks of the announcement."],
    ["Ongoing", "**E**, **F**, **G**",
     "Calendar-driven. Diary these rather than blitzing them - conferences buy 9-12 months ahead, nonprofits at fiscal year-end, sports before the season sales cycle."],
]
A(simple_table(order, [0.85*inch, 1.65*inch, 3.8*inch]))
A(Spacer(1, 18))

A(Paragraph("3.  What each segment actually buys", st["h2"]))
A(Paragraph("Match the offer to the segment or the reply rate collapses.", st["body"]))
buys = [["Seg", "What they need", "What NOT to lead with"]]
buys += [
    ["A", "Overflow capacity, peak-week support, template systems, the work the new hire can't get to yet",
     "Don't pitch as a replacement for the role - the hiring manager will ignore you"],
    ["B", "White-label production capacity, fast turnaround, working invisibly in their brand and process",
     "Don't pitch strategy or narrative - that's their margin, you're threatening it"],
    ["C", "Sales deck, one-pager, investor-update template, conference collateral, data viz for new metrics",
     "Don't pitch a pitch deck - they just finished raising"],
    ["D", "LP decks for the fund itself, portfolio deck support, demo-day templates",
     "Don't ask for a referral in message one"],
    ["E", "Sponsorship prospectus, exhibitor brochure, floorplan graphics, post-event impact report",
     "Don't pitch in the 6 weeks before their event - nobody is listening"],
    ["F", "Sponsorship sales decks, partnership one-pagers, audience data viz, renewal recap decks",
     "Don't pitch generic brand design - they buy revenue collateral"],
    ["G", "Annual report, impact report, case for support, donor and board decks, data viz",
     "Don't lead on price - lead on donor trust and clarity"],
]
A(simple_table(buys, [0.4*inch, 3.15*inch, 2.75*inch], align_center=(0,)))
A(Spacer(1, 14))
A(callout("The single most important nuance",
          "A company that just closed a round does not want a pitch deck. It wants the collateral that "
          "turns money into revenue - sales decks, one-pagers, data visualisation. Pitch-deck work comes "
          "from companies **12-18 months post-raise** or **currently raising**. Get this backwards and "
          "Segment C will not reply."))
A(PageBreak())

# ---- 4. templates
A(Paragraph("4.  Message templates", st["h2"]))
A(Paragraph("4.1  LinkedIn connection note", st["h3"]))
A(Paragraph("Maximum 300 characters - that is the hard constraint. Trigger, one specific observation, "
            "no ask.", st["body"]))
notes = [
    ("Segment A", "Saw the Presentation Designer opening in Boston. Pursuit decks under an RFP deadline "
                  "are a different animal from marketing slides - happy to be a backstop for peak weeks "
                  "while you hire. No pitch, just leaving it here."),
    ("Segment B", "5,000+ decks and a San Diego studio - that's serious throughput. Do you run a freelance "
                  "bench for overflow? I do production-grade PowerPoint in someone else's brand system "
                  "without needing hand-holding."),
    ("Segment C", "Congrats on the seed. Usually the week after a raise is when someone notices the sales "
                  "deck is still the fundraising deck with the ask slide deleted. If that's on your list, "
                  "I'm around."),
    ("Segment D", "Pre-seed founders lose more deals to a confusing deck than a weak business. I'd happily "
                  "do a free teardown on one portfolio deck - useful to you either way, no strings."),
    ("Segment F", "Noticed you're out of the 2026 partner programme. Rebuilding a sponsorship story for "
                  "non-endemic brands is exactly the deck problem I like. Worth a look at your current "
                  "sales deck?"),
]
nrows = [[Paragraph(esc(k), S("nk", fontName="Helvetica-Bold", fontSize=8.4, leading=11.5,
                              textColor=ACCENT)),
          Paragraph('"' + esc(v) + '"', st["quote"])] for k, v in notes]
nt = Table(nrows, colWidths=[0.95*inch, 5.35*inch], hAlign="LEFT")
nt.setStyle(TableStyle([
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LINEBELOW", (0,0), (-1,-2), 0.4, RULE),
    ("BACKGROUND", (0,0), (-1,-1), BAND_2),
    ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
]))
A(nt)
A(Spacer(1, 16))

A(Paragraph("4.2  Email - first touch", st["h3"]))
A(Paragraph("Four sentences. No attachments. One link.", st["body"]))
A(mono_block([
    "Subject: <specific trigger, no adjectives>",
    "",
    "Hi <name>,",
    "",
    "<Trigger - one sentence, dated, factual.>",
    "",
    "<One sentence of insight that shows you understand their",
    "situation, not your service.>",
    "",
    "<What you'd do - concrete, scoped, small.>",
    "",
    "Portfolio: <link>. Worth 15 minutes?",
    "",
    "Fareed",
]))
A(Spacer(1, 14))
A(Paragraph("Worked example - Segment C, using prospect 53", st["h3"]))
A(mono_block([
    "Subject: Congrats on the $8M - one thought on what comes next",
    "",
    "Hi Luke,",
    "",
    "Saw Reservoir closed $8M on the 12th, led by Asymmetric.",
    "",
    "The Boston-metro expansion means your install crews and utility",
    "partners will need something to leave behind, and a homeowner-",
    "facing one-pager is a very different document from the deck that",
    "raised the round.",
    "",
    "I'd start with two things: a partner/utility deck and a single-page",
    "installer leave-behind, in your existing brand. Fixed price, about",
    "a week.",
    "",
    "Portfolio: <link>. Worth 15 minutes?",
    "",
    "Fareed",
]))
A(PageBreak())

A(Paragraph("4.3  Follow-up cadence", st["h3"]))
cad = [["Touch", "Day", "Channel", "Content"]]
cad += [
    ["1", "0", "LinkedIn connect + note", "Trigger, no ask"],
    ["2", "+3", "Email", "Full first touch (4.2 above)"],
    ["3", "+8", "LinkedIn DM, if connected", "One piece of specific value - e.g. a redesigned slide from their public deck"],
    ["4", "+17", "Email", "One line: \"Still worth a look, or should I close the loop?\""],
    ["5", "+45", "Email", "New trigger only. If there is no new trigger, don't send."],
]
A(simple_table(cad, [0.55*inch, 0.5*inch, 1.85*inch, 3.4*inch], align_center=(0, 1)))
A(Spacer(1, 8))
A(Paragraph("Stop at five. Then move them to a quarterly re-trigger list. Follow-ups are not new "
            "outreach - budget separate time for them or the cadence silently collapses.", st["note"]))
A(Spacer(1, 16))

A(Paragraph("5.  The move that converts best", st["h2"]))
A(Paragraph("For Segments C, F and G: do the work first, uninvited, and small.", st["lead"]))
A(Paragraph("Find one slide of theirs that is publicly available - a deck on their site, a conference "
            "talk, a sponsorship page, an annual report spread - rebuild <b>one</b> slide, and send it "
            "as an image in message 3. Not a full deck. One slide.", st["body"]))
A(callout("Why it works", "It costs 25 minutes and converts several times better than any written pitch, "
          "because it moves the conversation from \"can you design?\" to \"can you do this for the other "
          "19 slides?\" - a scoping question, not a trust question.", tone="green"))
A(Spacer(1, 18))

A(Paragraph("6.  Pricing anchors", st["h2"]))
A(Paragraph("Use these to sanity-check what you quote. You are competing against these numbers, not "
            "against nothing.", st["body"]))
pr = [["Benchmark", "Rate", "Source context"]]
pr += [
    ["US in-house presentation designer", "**$42.86/hr** average ($31.97-$45.43)", "ZipRecruiter, Aug 2026"],
    ["Suffolk - salaried Presentation Designer, Boston", "**$78,000-$106,000/yr**", "Job posting, Aug 2026"],
    ["Allied Sports - Presentation & Brand Designer, NYC", "**$75,000-$85,000/yr**", "Job posting, Aug 2026"],
    ["Freelance presentation designer, open market", "**$24-$240/hr**", "ZipRecruiter listings, Aug 2026"],
    ["Nonprofit graphic designer", "**$26.90/hr** average ($19.95-$31.25)", "ZipRecruiter, Aug 2026"],
    ["ManyPixels - dedicated designer", "**from $1,299/mo**", "Vendor pricing, 2026"],
    ["Design Pickle", "**~$1,918/mo** min + $119-299 platform", "Vendor pricing, 2026"],
    ["Superside - enterprise", "**~$5,000/mo**", "Vendor pricing, 2026"],
]
A(simple_table(pr, [2.7*inch, 2.15*inch, 1.45*inch]))
A(Spacer(1, 12))
A(Paragraph("What this tells you", st["h3"]))
A(bullets([
    "A salaried in-house designer costs an employer roughly **$6,500-$8,800 a month** all-in before overhead. Any retainer below that is defensible on pure economics - say so explicitly to Segment A.",
    "The subscription studios have set the market's mental anchor at **$1,300-$5,000 a month for a designer on tap**. Price a retainer inside that band and you land in a familiar, pre-approved-feeling range.",
    "Never quote hourly to Segment B agencies. They resell your time - quote **per slide or per deck** so their margin maths is easy.",
]))
A(PageBreak())

A(Paragraph("7.  Qualifying - who to drop fast", st["h2"]))
A(bullets([
    "They ask for spec work - a free sample deck for their actual project - before any call.",
    "They want unlimited revisions without a scope document.",
    "The budget conversation gets deferred twice.",
    "**Segment C only:** they raised pre-seed under roughly $500k. There is usually no design budget yet - put them on the 12-month re-trigger list instead of writing them off.",
]))
A(Spacer(1, 18))

A(Paragraph("8.  Objection handling", st["h2"]))
obj = [["They say", "You say"]]
obj += [
    ["\"We have someone in-house.\"",
     "\"Perfect - I'm not trying to replace them. I'm the person they call in the week three decks are due at once.\" Especially true for Segment A."],
    ["\"We use Canva / an AI tool now.\"",
     "\"Those are great for volume. They're weak on the one deck that decides an outcome - the board deck, the investor deck, the pitch you can't lose.\""],
    ["\"Send us your rates.\"",
     "Don't send a rate card cold. \"Rates depend on slide count and whether narrative is in scope - give me the deck and deadline and I'll price it in an hour.\""],
    ["\"Too expensive.\"",
     "Anchor to the in-house cost in section 6, or reduce scope - never rate. Cutting your rate teaches them your first number was fiction."],
    ["\"Not right now.\"",
     "\"Understood. When's your next raise / conference / annual report?\" Then diary it. That is a warm lead in four months, not a dead one."],
]
A(simple_table(obj, [2.05*inch, 4.25*inch]))
A(Spacer(1, 18))

A(Paragraph("9.  Weekly working rhythm", st["h2"]))
A(bullets([
    "**20 new prospects contacted per week** (message 1 only). The list is 100, so five weeks of new outreach.",
    "**Follow-ups are not new outreach.** Budget separate time or the cadence in 4.3 collapses.",
    "**Re-verify every trigger the morning you send it.** A closed job posting or a restated funding number is the fastest way to lose credibility in one sentence.",
    "**Log every reply, including no.** A \"no, not now\" with a date attached is the most valuable row in your CRM.",
]))

# ============================================ PART 2 - THE DIRECTORY
rows = list(csv.DictReader(open(os.path.join(SRC, "prospects.csv"))))
by_seg = {}
for r in rows:
    by_seg.setdefault(r["segment"], []).append(r)

A(NextPageTemplate("landscape"))
for e in new_page("Part 2 - The Prospect Directory"):
    A(e)

for e in section_head("PART 2", "The Prospect Directory",
                      "All 100 prospects, grouped by segment. Every row carries a dated buying trigger, "
                      "what to sell, and the job title to search on LinkedIn."):
    A(e)
A(Paragraph("Reading the table", st["h3"]))
A(Paragraph("<b>Contact</b> is the job title to search on LinkedIn alongside the company name - named "
            "individuals appear only where a public source names them. <b>P</b> is priority: "
            "<b>HIGH</b> contact this week, <b>MED</b> contact this month, <b>LOW</b> diary it. "
            "Rows numbered 76b, 93b and so on are grouped organisations that share one identical trigger "
            "and one identical pitch, expanded here for CRM use - which is why the directory runs to 105 "
            "rows for 100 prospects.", S("rd", fontSize=9, leading=13, textColor=INK_SOFT)))
A(Spacer(1, 10))

COLW = [0.42*inch, 1.72*inch, 2.5*inch, 2.12*inch, 1.55*inch, 0.92*inch, 0.47*inch]

def prio_cell(p):
    fg, bg, label = PRIO.get(p, PRIO["Medium"])
    return Paragraph('<b>%s</b>' % label,
                     S("pc", fontSize=6.6, leading=8.6, textColor=fg, alignment=TA_CENTER))

def directory_table(seg_rows_):
    data = [hdr_row(["#", "Prospect", "Buying trigger", "What to sell",
                     "Contact", "Channel", "P"])]
    prio_bg = []
    for i, r in enumerate(seg_rows_, start=1):
        name = "<b>%s</b>" % esc(r["prospect"])
        meta = esc(r["type"])
        loc = esc(r["location"])
        sub = meta + ((" &nbsp;/&nbsp; " + loc) if loc and loc != "-" else "")
        cell_name = Paragraph(name + "<br/><font size=6.8 color='#64748B'>" + sub + "</font>",
                              st["tcell_b"])
        trig = esc(r["buying_trigger"])
        date = esc(r["trigger_date"])
        note = esc(r["notes"])
        trig_html = trig + ("<br/><font size=6.8 color='#B45309'><b>" + date + "</b></font>" if date else "")
        if note:
            trig_html += "<br/><font size=6.6 color='#64748B'>" + note + "</font>"
        data.append([
            Paragraph(esc(r["id"]), st["tcell_c"]),
            cell_name,
            Paragraph(trig_html, st["tcell"]),
            Paragraph(esc(r["what_to_sell"]), st["tcell"]),
            Paragraph(esc(r["contact_role"]), st["tcell"]),
            Paragraph(esc(r["channel"]), st["tcell_sm"]),
            prio_cell(r["priority"]),
        ])
        prio_bg.append((i, PRIO.get(r["priority"], PRIO["Medium"])[1]))
    t = Table(data, colWidths=COLW, repeatRows=1, hAlign="LEFT")
    cmds = base_table_style(len(COLW))
    cmds += [("TOPPADDING", (0,1), (-1,-1), 4.5),
             ("BOTTOMPADDING", (0,1), (-1,-1), 4.5),
             ("ALIGN", (0,0), (0,-1), "CENTER"),
             ("VALIGN", (6,1), (6,-1), "MIDDLE")]
    for i in range(2, len(data), 2):
        cmds.append(("BACKGROUND", (0,i), (5,i), BAND_2))
    for i, bg in prio_bg:
        cmds.append(("BACKGROUND", (6,i), (6,i), bg))
    t.setStyle(TableStyle(cmds))
    return t

for idx, (code, key, name, cnt, why, angle) in enumerate(SEGMENTS):
    seg = by_seg.get(key, [])
    if idx > 0:
        for e in new_page("Part 2 - Segment %s" % code):
            A(e)
    # segment header block
    badge = Paragraph("<b>%s</b>" % code,
                      S("bg", fontName="Helvetica-Bold", fontSize=17, leading=21,
                        textColor=WHITE, alignment=TA_CENTER))
    head = [Paragraph(esc(name), S("sn", fontName="Helvetica-Bold", fontSize=14.5,
                                   leading=18, textColor=INK, spaceAfter=2)),
            Paragraph("%d prospects &nbsp;|&nbsp; %d directory rows" % (cnt, len(seg)),
                      S("sc", fontSize=8, leading=11, textColor=ACCENT))]
    ht = Table([[badge, head]], colWidths=[0.55*inch, 9.35*inch], hAlign="LEFT")
    ht.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), INK),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (1,0), (1,0), 10),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    A(ht)
    A(Spacer(1, 8))
    wa = Table([[Paragraph("<b>Why they're here</b><br/>" + esc(why),
                           S("w1", fontSize=8.4, leading=11.8, textColor=INK_SOFT)),
                 Paragraph("<b>How to pitch them</b><br/>" + esc(angle),
                           S("w2", fontSize=8.4, leading=11.8, textColor=INK_SOFT))]],
               colWidths=[4.9*inch, 5.0*inch], hAlign="LEFT")
    wa.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("BACKGROUND", (0,0), (0,0), BAND),
        ("BACKGROUND", (1,0), (1,0), ACCENT_L),
        ("LEFTPADDING", (0,0), (-1,-1), 9), ("RIGHTPADDING", (0,0), (-1,-1), 9),
        ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    A(wa)
    A(Spacer(1, 10))
    A(directory_table(seg))

# ============================================ PART 3 - PRIORITY WORKSHEET
A(NextPageTemplate("portrait"))
for e in new_page("Part 3 - Priority Worksheet"):
    A(e)
for e in section_head("PART 3", "Priority Worksheet",
                      "Every HIGH-priority prospect, pulled out of the directory and ready to work. "
                      "Print this page and tick them off."):
    A(e)

highs = [r for r in rows if r["priority"] == "High"]
A(Paragraph("%d prospects to contact this week" % len(highs), st["h2"]))
A(Paragraph("Sorted in the order the playbook tells you to work them: agencies and hiring signals "
            "first, then everything else.", st["body"]))

seg_order = {k: i for i, (_, k, _, _, _, _) in enumerate(
    [SEGMENTS[1], SEGMENTS[0]] + [s for s in SEGMENTS if s[0] not in ("A", "B")])}
highs.sort(key=lambda r: (seg_order.get(r["segment"], 99), r["id"]))

wrows = [["Done", "#", "Prospect", "Why now", "Contact"]]
for r in highs:
    wrows.append(["", r["id"], "**%s**" % r["prospect"],
                  r["buying_trigger"] + (" (%s)" % r["trigger_date"] if r["trigger_date"] else ""),
                  r["contact_role"]])
wt_data = [hdr_row(wrows[0])]
for r in wrows[1:]:
    wt_data.append([Paragraph("", st["cell"])] +
                   [Paragraph(rich(c), S("wc", fontSize=7.8, leading=10.2)) for c in r[1:]])
wt = Table(wt_data, colWidths=[0.58*inch, 0.34*inch, 1.5*inch, 2.44*inch, 1.44*inch],
           repeatRows=1, hAlign="LEFT")
wcmds = base_table_style(5)
wcmds += [("ALIGN", (0,0), (1,-1), "CENTER"),
          ("TOPPADDING", (0,1), (-1,-1), 5), ("BOTTOMPADDING", (0,1), (-1,-1), 5)]
for i in range(1, len(wt_data)):
    wcmds.append(("BOX", (0,i), (0,i), 0.4, RULE))
    wcmds.append(("BACKGROUND", (0,i), (0,i), WHITE))
for i in range(2, len(wt_data), 2):
    wcmds.append(("BACKGROUND", (1,i), (-1,i), BAND_2))
wt.setStyle(TableStyle(wcmds))
A(wt)
A(Spacer(1, 18))
A(callout("Where to start on Monday",
          "**SlideGenius** (row 15) is the single warmest door on the list - publicly hiring PowerPoint "
          "designers, explicitly open to remote candidates, applications to resumes@slidegenius.com. "
          "It is the one prospect here you can approach through a stated, open front door rather than "
          "cold. Send that one first."))

# ============================================ PART 4 - THE MESSAGES
import re as _re

def parse_messages(path):
    """Parse 04-outreach-messages.md into per-prospect message blocks."""
    txt = open(path).read().split("\n")
    items, cur = [], None
    i = 0
    while i < len(txt):
        l = txt[i]
        if l.startswith("### "):
            if cur: items.append(cur)
            head = l[4:].strip()
            cur = {"head": head, "reach": "", "pain": "", "note": "", "follow": []}
        elif cur is not None and l.startswith("**Reach:**"):
            cur["reach"] = l.replace("**Reach:**", "").strip()
        elif cur is not None and l.startswith("**Their pain:**"):
            cur["pain"] = l.replace("**Their pain:**", "").strip()
        elif cur is not None and l.strip() == "**Note**":
            j = i + 1
            while j < len(txt) and not txt[j].startswith(">"): j += 1
            cur["note"] = txt[j][1:].strip()
            i = j
        elif cur is not None and l.strip() == "**Follow-up**":
            j, body = i + 1, []
            while j < len(txt) and (txt[j].startswith(">") or not txt[j].strip()):
                if txt[j].startswith(">"):
                    body.append(txt[j][1:].strip())
                elif body and body[-1] != "":
                    body.append("")
                j += 1
            cur["follow"] = [b for b in body]
            i = j - 1
        i += 1
    if cur: items.append(cur)
    return items

def strip_md(s_):
    """Drop markdown links and emphasis for PDF rendering."""
    s_ = _re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s_)
    s_ = s_.replace("**", "").replace("`", "")
    return s_

MSGS = parse_messages(os.path.join(SRC, "04-outreach-messages.md"))

A(NextPageTemplate("portrait"))
for e in new_page("Part 4 - The 27 Messages"):
    A(e)
for e in section_head("PART 4", "The 27 Messages",
                      "One tailored message set per high-priority prospect, in send order: "
                      "agencies first, then hiring signals, funded startups, accelerators, "
                      "events and esports."):
    A(e)
A(Paragraph("Reading each entry", st["h3"]))
A(Paragraph("<b>Reach</b> is where to find them - verified emails and pages where they exist, "
            "otherwise a LinkedIn people-search that runs the query for you. <b>Pain</b> is the one "
            "thing actually broken for them; everything in the message serves it. <b>Note</b> is the "
            "LinkedIn connection request, hard-capped at 300 characters. <b>Follow-up</b> goes on day "
            "+3, as email or DM.",
            S("m0", fontSize=9, leading=12.8, textColor=INK_SOFT, spaceAfter=8)))
A(callout("Two rules that decide whether these work",
          "**Never invent urgency.** Every deadline below is their calendar - a demo day, a "
          "conference date, a sponsorship cycle. Adding fake scarcity marks you as someone with no "
          "work. **Never offer a pitch deck to Segment C.** They just finished raising; that job is "
          "done for 12-18 months. Sell what breaks after the round."))
A(Spacer(1, 6))

st["m_head"]  = S("mh", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=INK, spaceAfter=3)
st["m_meta"]  = S("mm", fontSize=7.8, leading=10.8, textColor=MUTED, spaceAfter=5)
st["m_pain"]  = S("mp", fontSize=8.6, leading=12, textColor=INK_SOFT)
st["m_note"]  = S("mn2", fontSize=8.8, leading=12.4, textColor=INK_SOFT)
st["m_fol"]   = S("mf", fontSize=8.6, leading=12.2, textColor=INK_SOFT)
st["m_lbl"]   = S("ml", fontName="Helvetica-Bold", fontSize=7.2, leading=9.6, textColor=ACCENT)

W = 6.3*inch

def labelled_box(label, flows, bg, bar):
    inner = [Paragraph(esc(label), st["m_lbl"]), Spacer(1, 3)] + flows
    t = Table([[inner]], colWidths=[W], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("LINEBEFORE", (0,0), (0,-1), 2.2, bar),
        ("LEFTPADDING", (0,0), (-1,-1), 9), ("RIGHTPADDING", (0,0), (-1,-1), 9),
        ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 7),
    ]))
    return t

for m in MSGS:
    block = []
    block.append(Paragraph(esc(strip_md(m["head"])), st["m_head"]))
    if m["reach"]:
        block.append(Paragraph("<b>Reach</b>  " + esc(strip_md(m["reach"])), st["m_meta"]))
    if m["pain"]:
        block.append(labelled_box("THE PAIN",
                                  [Paragraph(rich(strip_md(m["pain"])), st["m_pain"])],
                                  BAND, INK_SOFT))
        block.append(Spacer(1, 6))
    if m["note"]:
        n = strip_md(m["note"])
        block.append(labelled_box("LINKEDIN NOTE  (%d / 300 characters)" % len(m["note"]),
                                  [Paragraph('"' + esc(n) + '"', st["m_note"])],
                                  ACCENT_L, ACCENT))
        block.append(Spacer(1, 6))
    if m["follow"]:
        paras = []
        for line in m["follow"]:
            if line:
                paras.append(Paragraph(rich(strip_md(line)), st["m_fol"]))
                paras.append(Spacer(1, 4))
        if paras: paras.pop()
        block.append(labelled_box("FOLLOW-UP  (day +3, email or DM)", paras, BAND_2, FAINT))
    block.append(Spacer(1, 16))
    A(KeepTogether(block))

# ------------------------------------------------------------- build
Doc(OUT).build(story)
print("built:", OUT, os.path.getsize(OUT), "bytes")
