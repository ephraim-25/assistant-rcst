"""
pdf_reporter.py — Générateur de rapports PDF institutionnels RCST (B2 & B3)
============================================================================
Conçoit deux formats de rapports PDF institutionnels aux couleurs de la RCST
(Conseil Scientifique National RDC) :

1. RAPPORT AUTEUR (B2) :
   - Destiné au chercheur / auteur soumettant son article.
   - Ton exclusivement constructif, pédagogique et bienveillant.
   - En-tête officiel RCST, métadonnées du manuscrit, non-conformités détaillées
     avec extraits et exemples de correction concrets.
   - AUCUNE mention de notes internes, délibérations secrètes ou scores confidentiels.

2. RAPPORT ÉDITEUR (B3) :
   - Destiné au comité de lecture et à l'éditeur principal.
   - Synthèse décisionnelle et analytique en 3 blocs stricts :
       🔴 À corriger (Bloquant - CRITICAL)
       🟡 À vérifier (Avertissement - WARNING)
       🟢 Conforme (Validé - PASSED)
   - Score global de conformité (/100), recommandation éditoriale formelle,
     statistiques détaillées et récapitulatif des règles vérifiées.
"""
from __future__ import annotations

import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

try:
    from .rules_engine import RuleViolation, RulesReport, Severity, compute_score_from_report, run_all_rules
except (ImportError, ValueError):
    from rules_engine import RuleViolation, RulesReport, Severity, compute_score_from_report, run_all_rules


# ─── Charte Graphique RCST ────────────────────────────────────────────────────

COLOR_PRIMARY = colors.HexColor("#0D1B2A")      # Bleu Nuit Institutionnel
COLOR_SECONDARY = colors.HexColor("#1B263B")    # Bleu Marine Profond
COLOR_ACCENT = colors.HexColor("#2B7A78")       # Vert Émeraude / Sarcelle
COLOR_DARK = colors.HexColor("#111827")         # Texte sombre
COLOR_MUTED = colors.HexColor("#4B5563")        # Texte gris moyen
COLOR_LIGHT_BG = colors.HexColor("#F8FAFC")     # Fond carte neutre
COLOR_BORDER = colors.HexColor("#E2E8F0")       # Bordure douce

# Couleurs de statut / sévérité
COLOR_CRITICAL_BG = colors.HexColor("#FEF2F2")
COLOR_CRITICAL_TXT = colors.HexColor("#991B1B")
COLOR_CRITICAL_BORDER = colors.HexColor("#F87171")

COLOR_WARNING_BG = colors.HexColor("#FFFBEB")
COLOR_WARNING_TXT = colors.HexColor("#92400E")
COLOR_WARNING_BORDER = colors.HexColor("#FBBF24")

COLOR_SUCCESS_BG = colors.HexColor("#F0FDF4")
COLOR_SUCCESS_TXT = colors.HexColor("#166534")
COLOR_SUCCESS_BORDER = colors.HexColor("#4ADE80")


# ─── Modèles de correction par règle ──────────────────────────────────────────

RULE_CORRECTION_MODELS = {
    "RCST-S01": (
        "Adopter un style strictement impersonnel et passif. "
        "Exemples : Remplacer « nous avons analysé » par « une analyse a été conduite » ; "
        "« notre étude prouve » par « les données démontrent »."
    ),
    "RCST-C01": (
        "Remplacer toutes les citations numériques par le format APA 7e édition (Auteur, Année). "
        "Exemples : [1] → (Mboma, 2022) ; [2,3] → (Kabasele, 2020 ; Tshilombo, 2021)."
    ),
    "RCST-A01": (
        "Renseigner l'identifiant ORCID complet à 16 chiffres (ex: 0000-0002-1825-0097) "
        "pour chaque co-auteur de l'article (inscription gratuite sur https://orcid.org)."
    ),
    "RCST-R01": (
        "Fournir impérativement un résumé bilingue complet composé de : "
        "1. Résumé en français (max 250 mots) avec 5 mots-clés ; "
        "2. Abstract en anglais (max 250 mots) avec 5 keywords."
    ),
    "RCST-R02-FR": (
        "Condenser le Résumé en français sous le plafond strict de 250 mots "
        "(Constitution RCST §3). Supprimer les détails méthodologiques secondaires."
    ),
    "RCST-R02-EN": (
        "Condenser l'Abstract en anglais sous le plafond strict de 250 mots "
        "(Constitution RCST §3)."
    ),
    "RCST-F01": (
        "Ajouter les 6 sections finales obligatoires à la fin de l'article : "
        "Remerciements, Financement, Conflit d'intérêt, Considérations éthiques, "
        "Contribution des auteurs (initiales) et ORCID des auteurs."
    ),
    "RCST-N01": (
        "Numéroter les sections principales en chiffres arabes : "
        "1. Introduction, 2. Méthodologie, 3. Résultats, 4. Discussion, 5. Conclusion."
    ),
    "RCST-A02": (
        "Identifier clairement l'auteur correspondant avec un astérisque (*), "
        "son adresse e-mail institutionnelle et son numéro de téléphone professionnel."
    ),
    "RCST-T01a": (
        "Numéroter les tableaux en chiffres romains (Tableau I, Tableau II) "
        "et placer le titre au-dessus (avant) le tableau."
    ),
    "RCST-T01b": (
        "Numéroter les figures en chiffres arabes (Figure 1, Figure 2) "
        "et placer la légende en-dessous (après) l'illustration."
    ),
}

RULE_DESCRIPTIONS = {
    "RCST-S01": "Style impersonnel et interdiction des pronoms subjectifs (nous, je, notre)",
    "RCST-C01": "Système de citations APA 7e édition (prohibition des crochets numériques)",
    "RCST-A01": "Présence obligatoire des identifiants ORCID des auteurs",
    "RCST-R01": "Présence d'un résumé bilingue intégral (Français / Anglais) et des mots-clés",
    "RCST-R02-FR": "Plafond de longueur du résumé en français (maximum 250 mots)",
    "RCST-R02-EN": "Plafond de longueur de l'abstract en anglais (maximum 250 mots)",
    "RCST-F01": "Présence des 6 sections obligatoires de fin d'article",
    "RCST-N01": "Numérotation des sections en chiffres arabes (1., 2., 3.)",
    "RCST-A02": "Coordonnées de l'auteur correspondant (astérisque, e-mail, téléphone)",
    "RCST-T01a": "Typographie et numérotation des tableaux (chiffres romains)",
    "RCST-T01b": "Typographie et numérotation des figures (chiffres arabes)",
}


# ─── Numérotation dynamique des pages ─────────────────────────────────────────

class NumberedCanvas(canvas.Canvas):
    """Canvas à deux passes pour numéroter 'Page X sur Y' et insérer l'en-tête/pied-de-page."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(COLOR_MUTED)

        # Ligne de pied de page
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(1.5 * cm, 1.3 * cm, 19.5 * cm, 1.3 * cm)

        # Texte de pied de page
        footer_left = "Revue Congolaise des Sciences & Technologies — Conseil Scientifique National (RDC)"
        footer_right = f"Page {self._pageNumber} sur {total_pages}"
        self.drawString(1.5 * cm, 0.9 * cm, footer_left)
        self.drawRightString(19.5 * cm, 0.9 * cm, footer_right)

        # En-tête (à partir de la page 2)
        if self._pageNumber > 1:
            self.setStrokeColor(COLOR_BORDER)
            self.setLineWidth(0.5)
            self.line(1.5 * cm, 28.5 * cm, 19.5 * cm, 28.5 * cm)
            header_text = "Rapport d'Audit Éditorial RCST"
            self.drawString(1.5 * cm, 28.7 * cm, header_text)
            date_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")
            self.drawRightString(19.5 * cm, 28.7 * cm, f"Édité le {date_str}")

        self.restoreState()


# ─── Utilitaires de styles ───────────────────────────────────────────────────

def _get_styles() -> Dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()

    styles = {
        "DocTitle": ParagraphStyle(
            "DocTitle",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=COLOR_PRIMARY,
            spaceAfter=4,
        ),
        "DocSubtitle": ParagraphStyle(
            "DocSubtitle",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=COLOR_ACCENT,
            spaceAfter=12,
        ),
        "SectionHeading": ParagraphStyle(
            "SectionHeading",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=COLOR_PRIMARY,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "SubsectionHeading": ParagraphStyle(
            "SubsectionHeading",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=COLOR_SECONDARY,
            spaceBefore=6,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=COLOR_DARK,
            spaceAfter=4,
        ),
        "BodyBold": ParagraphStyle(
            "BodyBold",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=13,
            textColor=COLOR_DARK,
        ),
        "MetaLabel": ParagraphStyle(
            "MetaLabel",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=COLOR_MUTED,
        ),
        "MetaValue": ParagraphStyle(
            "MetaValue",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=COLOR_DARK,
        ),
        "ViolationTitle": ParagraphStyle(
            "ViolationTitle",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
            textColor=COLOR_PRIMARY,
        ),
        "ViolationMessage": ParagraphStyle(
            "ViolationMessage",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_DARK,
            spaceBefore=2,
            spaceAfter=3,
        ),
        "ExcerptText": ParagraphStyle(
            "ExcerptText",
            parent=sample["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=11,
            textColor=COLOR_MUTED,
        ),
        "CorrectionText": ParagraphStyle(
            "CorrectionText",
            parent=sample["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            textColor=COLOR_SECONDARY,
        ),
        "ScoreNumber": ParagraphStyle(
            "ScoreNumber",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=28,
            leading=32,
            alignment=1,  # Centré
            textColor=COLOR_PRIMARY,
        ),
        "ScoreLabel": ParagraphStyle(
            "ScoreLabel",
            parent=sample["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=COLOR_MUTED,
        ),
    }
    return styles


def _clean_text(val: Optional[str]) -> str:
    """Échappe le texte pour ReportLab XML."""
    if not val:
        return ""
    return escape(str(val))


def _extract_report_data(
    report_dict: Optional[Dict[str, Any]] = None,
    manuscript_text: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Extrait ou génère les données nécessaires aux rapports depuis le dict ou le texte.
    """
    if report_dict and report_dict.get("rulesReport"):
        rr = report_dict["rulesReport"]
        violations = [
            RuleViolation(
                rule_id=v.get("rule_id", "RCST-XXX"),
                severity=Severity(v.get("severity", "WARNING")),
                title=v.get("title", ""),
                message=v.get("message", ""),
                excerpt=v.get("excerpt", ""),
                position=v.get("position"),
            )
            for v in rr.get("violations", [])
        ]
        passed = rr.get("passed", [])
        score = report_dict.get("globalScore", 100)
        status = report_dict.get("status", "Conforme")
        summary = report_dict.get("summary", "")
        editorial_notes = report_dict.get("editorialBoardNotes", {})
    elif manuscript_text:
        rules_report = run_all_rules(manuscript_text)
        score, status = compute_score_from_report(rules_report)
        violations = rules_report.violations
        passed = rules_report.passed
        summary = f"Audit déterministe réalisé avec succès. Avis : {status}."
        editorial_notes = {}
    else:
        violations = []
        passed = list(RULE_DESCRIPTIONS.keys())
        score = 100
        status = "Conforme"
        summary = "Aucune non-conformité détectée."
        editorial_notes = {}

    return {
        "violations": violations,
        "passed": passed,
        "score": score,
        "status": status,
        "summary": summary,
        "editorial_notes": editorial_notes,
    }


# ═════════════════════════════════════════════════════════════════════════════
# B2 — RAPPORT AUTEUR (Constructif, Pédagogique, sans notes confidentielles)
# ═════════════════════════════════════════════════════════════════════════════

def generate_author_pdf(
    manuscript_title: str,
    author_name: str = "Auteur(s)",
    source_filename: str = "manuscrit.docx",
    audit_report: Optional[Dict[str, Any]] = None,
    manuscript_text: Optional[str] = None,
    date_str: Optional[str] = None,
) -> bytes:
    """
    Génère le Rapport d'Audit Auteur (B2) au format PDF.

    Ce document est destiné à être remis à l'auteur pour lui indiquer
    précisément comment mettre son manuscrit en conformité avec la Constitution RCST.
    """
    data = _extract_report_data(audit_report, manuscript_text)
    violations: List[RuleViolation] = data["violations"]
    styles = _get_styles()

    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
    )

    story = []

    # ── 1. En-tête Institutionnel ─────────────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</b><br/>"
                      "Conseil Scientifique National<br/>"
                      "<b>Revue Congolaise des Sciences & Technologies (RCST)</b>",
                      styles["MetaLabel"]),
            Paragraph(f"<b>RAPPORT DE CONFORMITÉ ÉDITORIALE</b><br/>"
                      f"<font color='{COLOR_ACCENT.hexval()}'>Guide d'accompagnement de l'auteur</font><br/>"
                      f"Date d'évaluation : {date_str}",
                      styles["MetaValue"]),
        ]
    ]
    header_table = Table(header_data, colWidths=[10.5 * cm, 7.5 * cm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=COLOR_PRIMARY, spaceBefore=6, spaceAfter=10))

    # ── 2. Fiche du Manuscrit ─────────────────────────────────────────────────
    meta_content = [
        [
            Paragraph("<b>Titre du manuscrit :</b>", styles["MetaLabel"]),
            Paragraph(_clean_text(manuscript_title), styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Auteur(s) :</b>", styles["MetaLabel"]),
            Paragraph(_clean_text(author_name), styles["MetaValue"]),
        ],
        [
            Paragraph("<b>Fichier source :</b>", styles["MetaLabel"]),
            Paragraph(_clean_text(source_filename), styles["MetaValue"]),
        ],
    ]
    meta_table = Table(meta_content, colWidths=[4.0 * cm, 14.0 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # ── 3. Mot d'accueil bienveillant ─────────────────────────────────────────
    intro_p = Paragraph(
        "Chère consœur, Cher confrère,<br/>"
        "La Revue Congolaise des Sciences & Technologies applique les standards rigoureux "
        "de la Constitution Éditoriale RCST (normes APA 7, style impersonnel strict, indexation internationale). "
        "Ce rapport identifie de manière constructive les ajustements formels requis afin de garantir "
        "le passage optimal de votre manuscrit devant le comité de lecture.",
        styles["Body"],
    )
    story.append(intro_p)
    story.append(Spacer(1, 8))

    # ── 4. Liste des non-conformités classées par règle ────────────────────────
    story.append(Paragraph("Points d'Ajustement Détectés", styles["SectionHeading"]))

    if not violations:
        no_violation_card = Table(
            [[
                Paragraph("<b>Félicitations !</b><br/>"
                          "Aucune non-conformité majeure n'a été détectée dans la structure "
                          "de votre manuscrit. Votre document respecte les exigences fondamentales de la RCST.",
                          styles["Body"])
            ]],
            colWidths=[18.0 * cm],
        )
        no_violation_card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_SUCCESS_BG),
            ("BOX", (0, 0), (-1, -1), 1, COLOR_SUCCESS_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(no_violation_card)
    else:
        for idx, v in enumerate(violations, 1):
            is_critical = (v.severity == Severity.CRITICAL)
            bg_col = COLOR_CRITICAL_BG if is_critical else COLOR_WARNING_BG
            border_col = COLOR_CRITICAL_BORDER if is_critical else COLOR_WARNING_BORDER
            badge_txt = "Obligatoire (Bloquant)" if is_critical else "Recommandation majeure"
            badge_col = COLOR_CRITICAL_TXT if is_critical else COLOR_WARNING_TXT

            title_row = [
                Paragraph(
                    f"<b>{idx}. [{v.rule_id}] {_clean_text(v.title)}</b>",
                    styles["ViolationTitle"],
                ),
                Paragraph(
                    f"<b><font color='{badge_col.hexval()}'>{badge_txt}</font></b>",
                    ParagraphStyle("Badge", parent=styles["MetaLabel"], alignment=2),
                ),
            ]

            card_rows = [
                title_row,
                [Paragraph(f"<b>Constat :</b> {_clean_text(v.message)}", styles["ViolationMessage"]), ""],
            ]

            if v.excerpt:
                card_rows.append([
                    Paragraph(
                        f"<b>Extrait du texte :</b> <i>« {_clean_text(v.excerpt[:200])} »</i>",
                        styles["ExcerptText"],
                    ),
                    "",
                ])

            corr_model = RULE_CORRECTION_MODELS.get(
                v.rule_id,
                "Se référer à la Constitution RCST pour la mise aux normes de cette section."
            )
            card_rows.append([
                Paragraph(
                    f"<b>Comment corriger :</b><br/>{corr_model}",
                    styles["CorrectionText"],
                ),
                "",
            ])

            card_table = Table(card_rows, colWidths=[14.0 * cm, 4.0 * cm])
            card_table.setStyle(TableStyle([
                ("SPAN", (0, 1), (1, 1)),
                ("SPAN", (0, 2), (1, 2)),
                ("SPAN", (0, len(card_rows) - 1), (1, len(card_rows) - 1)),
                ("BACKGROUND", (0, 0), (-1, -1), bg_col),
                ("BOX", (0, 0), (-1, -1), 0.75, border_col),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E5E7EB")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))

            story.append(KeepTogether([card_table, Spacer(1, 6)]))

    # ── 5. Recommandations Pédagogiques & Étapes suivantes ────────────────────
    story.append(Spacer(1, 8))
    next_steps = Paragraph(
        "<b>Étapes recommandées pour la révision :</b><br/>"
        "1. Téléchargez le manuscrit Word annoté (fourni par la plateforme) pour visualiser chaque passage concerné.<br/>"
        "2. Appliquez les corrections en privilégiant le style impersonnel passif et la rigueur du format APA 7.<br/>"
        "3. Vérifiez la présence de toutes les sections requises avant de déposer la version révisée.<br/>"
        "Le secrétariat éditorial de la RCST reste à votre disposition pour tout accompagnement technique.",
        styles["Body"],
    )
    story.append(next_steps)

    # Construction du document
    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()


# ═════════════════════════════════════════════════════════════════════════════
# B3 — RAPPORT ÉDITEUR (Décisionnel, Analytique, 3 blocs stricts)
# ═════════════════════════════════════════════════════════════════════════════

def generate_editor_pdf(
    manuscript_title: str,
    author_name: str = "Auteur(s)",
    source_filename: str = "manuscrit.docx",
    reviewer_name: str = "Comité Éditorial",
    audit_report: Optional[Dict[str, Any]] = None,
    manuscript_text: Optional[str] = None,
    date_str: Optional[str] = None,
) -> bytes:
    """
    Génère le Rapport d'Audit Éditeur (B3) au format PDF.

    Structuré en 3 blocs stricts pour les membres du comité et l'éditeur en chef :
      🔴 À corriger (Bloquant - Sévérité CRITICAL)
      🟡 À vérifier (Avertissement - Sévérité WARNING)
      🟢 Conforme (Validé - Règles respectées)
    Inclut le score global (/100) et la recommandation décisionnelle formelle.
    """
    data = _extract_report_data(audit_report, manuscript_text)
    violations: List[RuleViolation] = data["violations"]
    passed_ids: List[str] = data["passed"]
    score: int = data["score"]
    status: str = data["status"]
    summary: str = data["summary"]
    styles = _get_styles()

    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

    # Répartition des violations par gravité
    critical_violations = [v for v in violations if v.severity == Severity.CRITICAL]
    warning_violations = [v for v in violations if v.severity == Severity.WARNING]

    # Détermination de la couleur du score
    if score >= 80:
        score_color = COLOR_SUCCESS_TXT
        status_color = COLOR_SUCCESS_TXT
    elif score >= 50:
        score_color = COLOR_WARNING_TXT
        status_color = COLOR_WARNING_TXT
    else:
        score_color = COLOR_CRITICAL_TXT
        status_color = COLOR_CRITICAL_TXT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
    )

    story = []

    # ── 1. En-tête Institutionnel Éditeur ─────────────────────────────────────
    header_data = [
        [
            Paragraph("<b>RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</b><br/>"
                      "Conseil Scientifique National<br/>"
                      "<b>Revue Congolaise des Sciences & Technologies</b>",
                      styles["MetaLabel"]),
            Paragraph("<b>DOSSIER D'INSTRUCTION ÉDITORIALE</b><br/>"
                      "<font color='#B91C1C'><b>DOCUMENT CONFIDENTIEL — USAGE INTERNE</b></font><br/>"
                      f"Édité le : {date_str}",
                      styles["MetaValue"]),
        ]
    ]
    header_table = Table(header_data, colWidths=[10.5 * cm, 7.5 * cm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=2, color=COLOR_PRIMARY, spaceBefore=4, spaceAfter=8))

    # ── 2. Tableau de bord décisionnel (Score & Métadonnées) ───────────────────
    score_display = (
        f"<font color='{score_color.hexval()}'>{score}</font>"
        f"<font size='14' color='{COLOR_MUTED.hexval()}'>/100</font>"
    )

    kpi_table_data = [
        [
            Paragraph("<b>Indice de Conformité RCST</b>", styles["ScoreLabel"]),
            Paragraph("<b>Fiche d'Évaluation du Manuscrit</b>", styles["BodyBold"]),
        ],
        [
            Paragraph(score_display, styles["ScoreNumber"]),
            Paragraph(
                f"<b>Manuscrit :</b> {_clean_text(manuscript_title)}<br/>"
                f"<b>Auteur principal :</b> {_clean_text(author_name)}<br/>"
                f"<b>Fichier évalué :</b> {_clean_text(source_filename)}<br/>"
                f"<b>Instructeur / Rôle :</b> {_clean_text(reviewer_name)}",
                styles["Body"],
            ),
        ],
        [
            Paragraph(
                f"<b>Avis :</b> <font color='{status_color.hexval()}'><b>{status.upper()}</b></font>",
                styles["ScoreLabel"],
            ),
            Paragraph(
                f"<b>Synthèse analytique :</b> {_clean_text(summary)}",
                styles["MetaValue"],
            ),
        ],
    ]

    kpi_table = Table(kpi_table_data, colWidths=[5.5 * cm, 12.5 * cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT_BG),
        ("BOX", (0, 0), (-1, -1), 1, COLOR_PRIMARY),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # ── 3. BLOC 1 : 🔴 À CORRIGER (Bloquant - Sévérité CRITICAL) ──────────────
    crit_count = len(critical_violations)
    story.append(Paragraph(
        f"🔴 <b>À Corriger Impérativement — Non-conformités Bloquantes ({crit_count})</b>",
        styles["SectionHeading"],
    ))

    if not critical_violations:
        none_crit = Table(
            [[Paragraph("Aucune non-conformité bloquante détectée. "
                        "Le manuscrit ne présente aucun motif de rejet immédiat sur les règles critiques.",
                        styles["Body"])]],
            colWidths=[18.0 * cm],
        )
        none_crit.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_SUCCESS_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_SUCCESS_BORDER),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(none_crit)
    else:
        for idx, v in enumerate(critical_violations, 1):
            row = [
                [
                    Paragraph(f"<b>{idx}. [{v.rule_id}] {_clean_text(v.title)}</b>", styles["ViolationTitle"]),
                    Paragraph("<b><font color='#991B1B'>REJET TANT QUE NON CORRIGÉ</font></b>",
                              ParagraphStyle("Bdg", parent=styles["MetaLabel"], alignment=2)),
                ],
                [Paragraph(f"<b>Détail :</b> {_clean_text(v.message)}", styles["ViolationMessage"]), ""],
            ]
            if v.excerpt:
                row.append([
                    Paragraph(f"<b>Extrait fautif :</b> <i>« {_clean_text(v.excerpt[:180])} »</i>", styles["ExcerptText"]),
                    "",
                ])

            t = Table(row, colWidths=[13.5 * cm, 4.5 * cm])
            t.setStyle(TableStyle([
                ("SPAN", (0, 1), (1, 1)),
                ("SPAN", (0, len(row) - 1), (1, len(row) - 1)),
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_CRITICAL_BG),
                ("BOX", (0, 0), (-1, -1), 0.75, COLOR_CRITICAL_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(KeepTogether([t, Spacer(1, 4)]))

    story.append(Spacer(1, 6))

    # ── 4. BLOC 2 : 🟡 À VÉRIFIER (Avertissements - Sévérité WARNING) ─────────
    warn_count = len(warning_violations)
    story.append(Paragraph(
        f"🟡 <b>À Vérifier — Réserves & Avertissements ({warn_count})</b>",
        styles["SectionHeading"],
    ))

    if not warning_violations:
        none_warn = Table(
            [[Paragraph("Aucune réserve mineure à signaler.", styles["Body"])]],
            colWidths=[18.0 * cm],
        )
        none_warn.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_LIGHT_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(none_warn)
    else:
        for idx, v in enumerate(warning_violations, 1):
            row = [
                [
                    Paragraph(f"<b>{idx}. [{v.rule_id}] {_clean_text(v.title)}</b>", styles["ViolationTitle"]),
                    Paragraph("<b><font color='#92400E'>RÉSERVE MINEURE</font></b>",
                              ParagraphStyle("BdgW", parent=styles["MetaLabel"], alignment=2)),
                ],
                [Paragraph(f"<b>Constat :</b> {_clean_text(v.message)}", styles["ViolationMessage"]), ""],
            ]
            if v.excerpt:
                row.append([
                    Paragraph(f"<b>Extrait :</b> <i>« {_clean_text(v.excerpt[:180])} »</i>", styles["ExcerptText"]),
                    "",
                ])

            t = Table(row, colWidths=[14.0 * cm, 4.0 * cm])
            t.setStyle(TableStyle([
                ("SPAN", (0, 1), (1, 1)),
                ("SPAN", (0, len(row) - 1), (1, len(row) - 1)),
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_WARNING_BG),
                ("BOX", (0, 0), (-1, -1), 0.75, COLOR_WARNING_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(KeepTogether([t, Spacer(1, 4)]))

    story.append(Spacer(1, 6))

    # ── 5. BLOC 3 : 🟢 CONFORME (Validé - Règles respectées) ──────────────────
    passed_count = len(passed_ids)
    story.append(Paragraph(
        f"🟢 <b>Conforme — Règles Validées avec Succès ({passed_count})</b>",
        styles["SectionHeading"],
    ))

    if not passed_ids:
        none_pass = Paragraph("Aucune règle n'a été validée en totalité.", styles["Body"])
        story.append(none_pass)
    else:
        passed_rows = []
        for rid in passed_ids:
            desc = RULE_DESCRIPTIONS.get(rid, "Règle de structure et typographie conforme.")
            passed_rows.append([
                Paragraph(f"<b>✓ [{rid}]</b>", styles["BodyBold"]),
                Paragraph(desc, styles["Body"]),
            ])

        passed_table = Table(passed_rows, colWidths=[3.0 * cm, 15.0 * cm])
        passed_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_SUCCESS_BG),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_SUCCESS_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#DCFCE7")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(KeepTogether([passed_table]))

    # ── 6. Recommandation Décisionnelle Formelle ───────────────────────────────
    story.append(Spacer(1, 10))
    if score >= 80:
        recommendation_text = (
            "<b>DÉCISION CONSEILLÉE : RECEVABLE POUR RÉVISION PAR LES PAIRS</b><br/>"
            "Le manuscrit satisfait aux normes structurelles RCST. Les corrections mineures "
            "peuvent être intégrées lors du cycle ordinaire d'évaluation par les pairs."
        )
        rec_bg = COLOR_SUCCESS_BG
        rec_border = COLOR_SUCCESS_BORDER
    elif score >= 50:
        recommendation_text = (
            "<b>DÉCISION CONSEILLÉE : RÉVISION PRÉ-PEER-REVIEW REQUISE</b><br/>"
            "Le manuscrit présente des non-conformités notables. Une mise en conformité formelle "
            "doit être exigée de l'auteur avant transmission aux reviewers du domaine."
        )
        rec_bg = COLOR_WARNING_BG
        rec_border = COLOR_WARNING_BORDER
    else:
        recommendation_text = (
            "<b>DÉCISION CONSEILLÉE : REJET IMMÉDIAT EN L'ÉTAT (DESK REJECT)</b><br/>"
            "Le nombre élevé de non-conformités critiques contrevient aux principes fondateurs "
            "de la Constitution RCST. Une refonte intégrale de la forme est exigée."
        )
        rec_bg = COLOR_CRITICAL_BG
        rec_border = COLOR_CRITICAL_BORDER

    rec_table = Table([[Paragraph(recommendation_text, styles["BodyBold"])]], colWidths=[18.0 * cm])
    rec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), rec_bg),
        ("BOX", (0, 0), (-1, -1), 1, rec_border),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(KeepTogether([rec_table]))

    doc.build(story, canvasmaker=NumberedCanvas)
    return buf.getvalue()
