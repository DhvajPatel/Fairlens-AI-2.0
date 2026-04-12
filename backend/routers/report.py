from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
from datetime import datetime
from ml.dataset_store import store

router = APIRouter()

# ── Colour palette ────────────────────────────────────────────────────────────
C_BG       = colors.HexColor("#0f172a")
C_CARD     = colors.HexColor("#1e293b")
C_BORDER   = colors.HexColor("#334155")
C_PRIMARY  = colors.HexColor("#6366f1")
C_CYAN     = colors.HexColor("#06b6d4")
C_GREEN    = colors.HexColor("#10b981")
C_YELLOW   = colors.HexColor("#f59e0b")
C_RED      = colors.HexColor("#ef4444")
C_WHITE    = colors.HexColor("#f1f5f9")
C_MUTED    = colors.HexColor("#64748b")
C_MUTED2   = colors.HexColor("#334155")

def _style(name, **kw):
    base = {
        "fontName": "Helvetica",
        "fontSize": 10,
        "textColor": C_WHITE,
        "leading": 14,
        "spaceAfter": 0,
        "spaceBefore": 0,
    }
    base.update(kw)
    return ParagraphStyle(name, **base)

# ── Reusable styles ───────────────────────────────────────────────────────────
S_TITLE    = _style("title",   fontName="Helvetica-Bold", fontSize=26, textColor=C_PRIMARY,  leading=32, spaceAfter=2)
S_SUBTITLE = _style("sub",     fontName="Helvetica",      fontSize=10, textColor=C_CYAN,     leading=14)
S_H2       = _style("h2",      fontName="Helvetica-Bold", fontSize=13, textColor=C_WHITE,    leading=18, spaceBefore=6, spaceAfter=4)
S_BODY     = _style("body",    fontName="Helvetica",      fontSize=9,  textColor=C_MUTED,    leading=13)
S_MONO     = _style("mono",    fontName="Courier",        fontSize=8,  textColor=C_CYAN,     leading=12)
S_FOOTER   = _style("footer",  fontName="Helvetica",      fontSize=8,  textColor=C_MUTED2,   leading=10, alignment=TA_CENTER)
S_RISK_H   = _style("riskh",   fontName="Helvetica-Bold", fontSize=10, textColor=C_MUTED,    leading=13)
S_LABEL    = _style("label",   fontName="Helvetica",      fontSize=8,  textColor=C_MUTED,    leading=11)

def divider(color=C_BORDER):
    return HRFlowable(width="100%", thickness=0.5, color=color, spaceAfter=8, spaceBefore=4)

def section_header(text, color=C_PRIMARY):
    return [
        Paragraph(text, _style("sh", fontName="Helvetica-Bold", fontSize=13,
                                textColor=color, leading=18, spaceBefore=8, spaceAfter=2)),
        HRFlowable(width="100%", thickness=1, color=color, spaceAfter=8, spaceBefore=0),
    ]

def badge(text, bg, fg=C_WHITE):
    """Single-cell table used as a coloured badge."""
    t = Table([[Paragraph(text, _style("b", fontName="Helvetica-Bold", fontSize=9,
                                       textColor=fg, leading=11))]], colWidths=[3.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), bg),
        ("ROUNDEDCORNERS", [4]),
        ("TOPPADDING",  (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING",(0,0), (-1,-1), 8),
    ]))
    return t

@router.get("/generate")
def generate_report():
    df        = store.get("df")
    target    = store.get("target")
    sensitive = store.get("sensitive")
    fixed     = store.get("fixed_metrics")
    di        = store.get("disparate_impact") or 0.7
    dp        = store.get("demographic_parity_diff") or 0.0

    if df is None or target is None:
        raise HTTPException(status_code=400, detail="Run bias detection first")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        leftMargin=1.8*cm, rightMargin=1.8*cm
    )

    story = []
    W = 17.4 * cm   # usable width

    # ── HEADER BLOCK ─────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("FairLens AI 2.0", _style("ht", fontName="Helvetica-Bold", fontSize=22,
                                             textColor=C_PRIMARY, leading=26)),
        Paragraph("COMPLIANCE REPORT", _style("htr", fontName="Helvetica-Bold", fontSize=9,
                                               textColor=C_CYAN, leading=11,
                                               alignment=TA_CENTER)),
    ]]
    ht = Table(header_data, colWidths=[12*cm, 5.4*cm])
    ht.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_CARD),
        ("TOPPADDING",    (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING",   (0,0), (0,-1),  14),
        ("RIGHTPADDING",  (-1,0),(-1,-1), 14),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("LINEBELOW",     (0,0), (-1,-1), 2, C_PRIMARY),
    ]))
    story.append(ht)
    story.append(Spacer(1, 0.3*cm))

    # Meta row
    meta = Table([[
        Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d  %H:%M UTC')}", S_MONO),
        Paragraph("AI GOVERNANCE PLATFORM  v2.0", _style("mv", fontName="Courier",
                   fontSize=8, textColor=C_MUTED2, leading=12, alignment=TA_CENTER)),
    ]], colWidths=[9*cm, 8.4*cm])
    meta.setStyle(TableStyle([("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    story.append(meta)
    story.append(Spacer(1, 0.5*cm))

    # ── 1. DATASET OVERVIEW ───────────────────────────────────────────────────
    story += section_header("1.  Dataset Overview", C_CYAN)

    ds_data = [
        ["ROWS", "COLUMNS", "TARGET COLUMN", "SENSITIVE ATTRIBUTE"],
        [
            Paragraph(f"{len(df):,}", _style("dv", fontName="Helvetica-Bold", fontSize=16, textColor=C_WHITE, leading=20)),
            Paragraph(str(len(df.columns)), _style("dv", fontName="Helvetica-Bold", fontSize=16, textColor=C_WHITE, leading=20)),
            Paragraph(target,    _style("dv", fontName="Courier", fontSize=11, textColor=C_CYAN, leading=14)),
            Paragraph(sensitive, _style("dv", fontName="Courier", fontSize=11, textColor=C_YELLOW, leading=14)),
        ]
    ]
    ds_t = Table(ds_data, colWidths=[W/4]*4)
    ds_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  C_MUTED2),
        ("BACKGROUND",    (0,1), (-1,-1), C_CARD),
        ("TEXTCOLOR",     (0,0), (-1,0),  C_MUTED),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,0),  7),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("GRID",          (0,0), (-1,-1), 0.5, C_BORDER),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(ds_t)
    story.append(Spacer(1, 0.5*cm))

    # ── 2. BIAS DETECTION SUMMARY ─────────────────────────────────────────────
    story += section_header("2.  Bias Detection Summary", C_YELLOW)

    if di < 0.6:
        risk_label, risk_color, risk_note = (
            "HIGH RISK",
            C_RED,
            "Model likely violates EU AI Act Article 10 (data governance) and GDPR Article 22 "
            "(automated decision-making). Immediate remediation required before deployment."
        )
    elif di < 0.8:
        risk_label, risk_color, risk_note = (
            "MODERATE RISK",
            C_YELLOW,
            "Measurable bias detected. Model falls below the 80% rule threshold. "
            "Review recommended under Google Responsible AI practices before production use."
        )
    else:
        risk_label, risk_color, risk_note = (
            "LOW RISK",
            C_GREEN,
            "Model meets basic fairness thresholds (Disparate Impact >= 0.8). "
            "Continue monitoring and re-evaluate after data updates."
        )

    # Risk + metrics side by side
    risk_block = Table([[
        Paragraph("RISK LEVEL", S_LABEL),
        Paragraph("DISPARATE IMPACT", S_LABEL),
        Paragraph("DEMOGRAPHIC PARITY Delta", S_LABEL),
        Paragraph("FAIRNESS SCORE", S_LABEL),
    ],[
        Paragraph(risk_label, _style("rl", fontName="Helvetica-Bold", fontSize=15,
                                     textColor=risk_color, leading=18)),
        Paragraph(str(round(di, 3)), _style("rv", fontName="Helvetica-Bold", fontSize=15,
                                             textColor=risk_color, leading=18)),
        Paragraph(f"{round(dp, 2)}%", _style("rv2", fontName="Helvetica-Bold", fontSize=15,
                                              textColor=C_WHITE, leading=18)),
        Paragraph(f"{round(di*100,1)}%", _style("rv3", fontName="Helvetica-Bold", fontSize=15,
                                                  textColor=risk_color, leading=18)),
    ]], colWidths=[W/4]*4)
    risk_block.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_CARD),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("GRID",          (0,0), (-1,-1), 0.5, C_BORDER),
        ("LINEABOVE",     (0,0), (-1,0),  2, risk_color),
    ]))
    story.append(risk_block)
    story.append(Spacer(1, 0.25*cm))
    story.append(Paragraph(risk_note, S_BODY))
    story.append(Spacer(1, 0.5*cm))

    # ── 3. REGULATORY COMPLIANCE CHECK ───────────────────────────────────────
    story += section_header("3.  Regulatory Compliance Check", C_PRIMARY)

    ok   = "PASS"
    warn = "REVIEW REQUIRED"
    fail = "FAIL"

    def reg_status(threshold):
        if di >= threshold:  return (ok,   C_GREEN)
        if di >= threshold * 0.85: return (warn, C_YELLOW)
        return (fail, C_RED)

    regs = [
        ("EU AI Act",              "High-Risk AI — Article 10 data governance",          0.8),
        ("GDPR Article 22",        "Automated decision-making rights",                   0.8),
        ("Google Responsible AI",  "Socially beneficial, avoids unfair bias",            0.75),
        ("IBM AI Fairness 360",    "Disparate Impact >= 0.8 (80% rule)",                 0.8),
    ]

    reg_rows = [
        [
            Paragraph("REGULATION", _style("rh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11)),
            Paragraph("REQUIREMENT", _style("rh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11)),
            Paragraph("STATUS", _style("rh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11, alignment=TA_CENTER)),
        ]
    ]
    row_colors = []
    for i, (name, req, thr) in enumerate(regs):
        status, sc = reg_status(thr)
        icon = "✓" if status == ok else ("!" if status == warn else "✗")
        reg_rows.append([
            Paragraph(name, _style(f"rn{i}", fontName="Helvetica-Bold", fontSize=9, textColor=C_WHITE, leading=12)),
            Paragraph(req,  _style(f"rr{i}", fontName="Helvetica",      fontSize=8, textColor=C_MUTED, leading=11)),
            Paragraph(f"{icon}  {status}", _style(f"rs{i}", fontName="Helvetica-Bold", fontSize=8,
                                                   textColor=sc, leading=11, alignment=TA_CENTER)),
        ])
        row_colors.append(sc)

    reg_t = Table(reg_rows, colWidths=[4.5*cm, 8.5*cm, 4.4*cm])
    ts = [
        ("BACKGROUND",    (0,0), (-1,0),  C_PRIMARY),
        ("BACKGROUND",    (0,1), (-1,-1), C_CARD),
        ("TOPPADDING",    (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("GRID",          (0,0), (-1,-1), 0.5, C_BORDER),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]
    for i, sc in enumerate(row_colors):
        ts.append(("LINERIGHT", (-1, i+1), (-1, i+1), 3, sc))
    reg_t.setStyle(TableStyle(ts))
    story.append(reg_t)
    story.append(Spacer(1, 0.5*cm))

    # ── 4. BIAS CORRECTION RESULTS ────────────────────────────────────────────
    if fixed:
        story += section_header("4.  Bias Correction Results", C_GREEN)

        after_di = fixed["disparate_impact"]
        after_fs = fixed["fairness_score"]
        before_fs = round((store.get("orig_di") or 0.5) * 100, 1)
        improvement = round(after_fs - before_fs, 1)

        # Summary banner
        banner_text = f"Fairness improved by +{improvement}%  ({before_fs}% → {after_fs}%)"
        banner = Table([[Paragraph(banner_text, _style("bn", fontName="Helvetica-Bold",
                                                        fontSize=11, textColor=C_GREEN, leading=14))]],
                       colWidths=[W])
        banner.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#052e16")),
            ("TOPPADDING",    (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING",   (0,0), (-1,-1), 14),
            ("LINEABOVE",     (0,0), (-1,-1), 2, C_GREEN),
        ]))
        story.append(banner)
        story.append(Spacer(1, 0.3*cm))

        fix_rows = [
            [
                Paragraph("METRIC", _style("fh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11)),
                Paragraph("BEFORE", _style("fh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11, alignment=TA_CENTER)),
                Paragraph("AFTER",  _style("fh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11, alignment=TA_CENTER)),
                Paragraph("CHANGE", _style("fh", fontName="Helvetica-Bold", fontSize=8, textColor=C_WHITE, leading=11, alignment=TA_CENTER)),
            ],
        ]

        metrics = [
            ("Accuracy",              f"{fixed.get('before_accuracy','N/A')}%", f"{fixed['accuracy']}%",          True),
            ("Disparate Impact",      str(round(store.get('orig_di',0.5),3)),   str(fixed['disparate_impact']),    True),
            ("Demographic Parity Δ",  f"{store.get('demographic_parity_diff',0)}%", f"{fixed['demographic_parity_diff']}%", False),
            ("Fairness Score",        f"{before_fs}%",                          f"{after_fs}%",                    True),
        ]

        for label, bef, aft, higher_better in metrics:
            try:
                bv = float(str(bef).replace('%',''))
                av = float(str(aft).replace('%',''))
                improved = av > bv if higher_better else av < bv
                delta = av - bv
                delta_str = f"+{delta:.1f}" if delta >= 0 else f"{delta:.1f}"
                delta_color = C_GREEN if improved else C_RED
            except Exception:
                delta_str, delta_color = "—", C_MUTED

            fix_rows.append([
                Paragraph(label, _style(f"fl{label}", fontName="Helvetica-Bold", fontSize=9, textColor=C_WHITE, leading=12)),
                Paragraph(bef,   _style(f"fb{label}", fontName="Courier", fontSize=9, textColor=C_MUTED, leading=12, alignment=TA_CENTER)),
                Paragraph(aft,   _style(f"fa{label}", fontName="Courier-Bold", fontSize=9, textColor=C_GREEN, leading=12, alignment=TA_CENTER)),
                Paragraph(delta_str, _style(f"fd{label}", fontName="Courier-Bold", fontSize=9, textColor=delta_color, leading=12, alignment=TA_CENTER)),
            ])

        fix_t = Table(fix_rows, colWidths=[6*cm, 3.5*cm, 3.5*cm, 4.4*cm])
        fix_t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0),  C_GREEN),
            ("TEXTCOLOR",     (0,0), (-1,0),  colors.HexColor("#052e16")),
            ("BACKGROUND",    (0,1), (-1,-1), C_CARD),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [C_CARD, colors.HexColor("#162032")]),
            ("TOPPADDING",    (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING",   (0,0), (-1,-1), 10),
            ("GRID",          (0,0), (-1,-1), 0.5, C_BORDER),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]))
        story.append(fix_t)
        story.append(Spacer(1, 0.5*cm))

    # ── 5. RECOMMENDATIONS ───────────────────────────────────────────────────
    story += section_header("5.  Recommendations", C_CYAN)

    recs = [
        ("Continuous Auditing",      "Regularly audit model predictions across all demographic groups, especially after retraining."),
        ("Pre-deployment Review",    "Apply bias correction techniques and validate fairness metrics before any production deployment."),
        ("Explainability Logging",   "Maintain SHAP-based explainability logs for all automated decisions to ensure transparency."),
        ("Human-in-the-Loop",        "Conduct mandatory human review for high-stakes decisions (loans, hiring, insurance)."),
        ("Data Refresh Policy",      "Re-evaluate model fairness after every major data update or distribution shift."),
        ("Regulatory Monitoring",    "Track evolving EU AI Act and GDPR requirements and update compliance checks accordingly."),
    ]

    rec_rows = []
    for i, (title, desc) in enumerate(recs):
        rec_rows.append([
            Paragraph(f"0{i+1}", _style(f"ri{i}", fontName="Helvetica-Bold", fontSize=11,
                                         textColor=C_PRIMARY, leading=14)),
            Paragraph(f"<b>{title}</b><br/>{desc}",
                      _style(f"rd{i}", fontName="Helvetica", fontSize=9,
                              textColor=C_MUTED, leading=13)),
        ])

    rec_t = Table(rec_rows, colWidths=[1.2*cm, W - 1.2*cm])
    rec_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_CARD),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("GRID",          (0,0), (-1,-1), 0.5, C_BORDER),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [C_CARD, colors.HexColor("#162032")]),
    ]))
    story.append(rec_t)
    story.append(Spacer(1, 0.6*cm))

    # ── FOOTER ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=C_PRIMARY, spaceAfter=6))
    footer_t = Table([[
        Paragraph("Generated by FairLens AI 2.0  |  Responsible AI Governance Platform",
                  _style("fl", fontName="Helvetica", fontSize=8, textColor=C_MUTED2, leading=10)),
        Paragraph(f"Disparate Impact: {round(di,3)}  |  Risk: {risk_label}",
                  _style("fr", fontName="Courier", fontSize=8, textColor=C_PRIMARY, leading=10,
                         alignment=TA_CENTER)),
    ]], colWidths=[9*cm, 8.4*cm])
    footer_t.setStyle(TableStyle([("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    story.append(footer_t)

    # ── Build PDF with dark background ───────────────────────────────────────
    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(C_BG)
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # Subtle top accent line
        canvas.setStrokeColor(C_PRIMARY)
        canvas.setLineWidth(2)
        canvas.line(0, A4[1]-2, A4[0], A4[1]-2)
        # Bottom accent line
        canvas.setStrokeColor(C_CYAN)
        canvas.setLineWidth(1)
        canvas.line(0, 8, A4[0], 8)
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=fairlens_compliance_report.pdf"})
