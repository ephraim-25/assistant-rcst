"""
rules_engine.py — Moteur de règles déterministes RCST (A4)
===========================================================
Toutes les fonctions ici sont :
  • 100 % déterministes : même entrée → même sortie à chaque exécution
  • Indépendantes de Gemini (zéro appel réseau)
  • Identifiées par un code de règle unique (ex: RCST-S01)
  • Annotées avec gravité, extrait fautif et position dans le texte

Architecture :
  RuleViolation  — dataclass portant id, gravité, message, extrait, position
  Severity       — enum CRITICAL / WARNING / INFO
  run_all_rules  — point d'entrée : retourne RulesReport complet
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Tuple


# ─── Types ────────────────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING  = "WARNING"
    INFO     = "INFO"


@dataclass
class RuleViolation:
    rule_id:  str                # ex: "RCST-S01"
    severity: Severity
    title:    str                # Court intitulé de la règle
    message:  str                # Explication détaillée
    excerpt:  str = ""           # Passage fautif extrait du texte
    position: Optional[int] = None  # Offset de caractère dans le texte


@dataclass
class RulesReport:
    violations: List[RuleViolation] = field(default_factory=list)
    passed:     List[str]           = field(default_factory=list)  # IDs des règles OK

    # ── Métriques brutes partagées ──────────────────────────────────────────
    pronoun_count:           int  = 0
    bracket_citation_count:  int  = 0
    orcid_count:             int  = 0
    abstract_word_count_fr:  int  = 0
    abstract_word_count_en:  int  = 0
    has_keywords_fr:         bool = False
    has_keywords_en:         bool = False
    missing_sections:        List[str] = field(default_factory=list)

    @property
    def critical_count(self) -> int:
        return sum(1 for v in self.violations if v.severity == Severity.CRITICAL)

    @property
    def warning_count(self) -> int:
        return sum(1 for v in self.violations if v.severity == Severity.WARNING)

    def to_dict(self) -> dict:
        return {
            "violations": [
                {
                    "rule_id":  v.rule_id,
                    "severity": v.severity.value,
                    "title":    v.title,
                    "message":  v.message,
                    "excerpt":  v.excerpt,
                    "position": v.position,
                }
                for v in self.violations
            ],
            "passed":                 self.passed,
            "criticalCount":          self.critical_count,
            "warningCount":           self.warning_count,
            "pronoun_count":          self.pronoun_count,
            "bracket_citation_count": self.bracket_citation_count,
            "orcid_count":            self.orcid_count,
            "abstract_word_count_fr": self.abstract_word_count_fr,
            "abstract_word_count_en": self.abstract_word_count_en,
            "has_keywords_fr":        self.has_keywords_fr,
            "has_keywords_en":        self.has_keywords_en,
            "missing_sections":       self.missing_sections,
        }


# ─── Helpers internes ─────────────────────────────────────────────────────────

def _excerpt(text: str, match: re.Match, context: int = 40) -> Tuple[str, int]:
    """Retourne (extrait_contextualisé, position) depuis un objet Match."""
    start = max(0, match.start() - context)
    end   = min(len(text), match.end() + context)
    snippet = text[start:end].replace("\n", " ").strip()
    return f"…{snippet}…" if start > 0 or end < len(text) else snippet, match.start()


def _word_count(text: str) -> int:
    """Compte les mots (tokens non-vides séparés par des espaces/ponctuation)."""
    return len(re.findall(r"\b\w+\b", text))


# ═══════════════════════════════════════════════════════════════════════════════
# RÈGLES DÉTERMINISTES
# ═══════════════════════════════════════════════════════════════════════════════

# ── RCST-S01 : Pronoms subjectifs prohibés ─────────────────────────────────────

_PRONOUN_PATTERN = re.compile(
    r"\b("
    r"nous\s+avons|nous\s+pensons|nous\s+concluons|nous\s+avons\s+constaté|"
    r"nous\s+avons\s+analysé|nous\s+avons\s+observé|nous\s+avons\s+trouvé|"
    r"nos\s+travaux|notre\s+étude|notre\s+recherche|notre\s+analyse|"
    r"nos\s+résultats|nos\s+données|"
    r"nous|notre|nos|je\s+|j'|mon\s+|ma\s+|mes\s+"
    r")",
    re.IGNORECASE | re.UNICODE,
)


def check_prohibited_pronouns(text: str) -> List[RuleViolation]:
    """
    RCST-S01 — Détecte les pronoms subjectifs prohibés par la Constitution RCST.
    Gravité : CRITICAL si > 3 occurrences, WARNING sinon.
    """
    matches = list(_PRONOUN_PATTERN.finditer(text))
    if not matches:
        return []

    count = len(matches)
    excerpts = []
    for m in matches[:5]:
        snip, _ = _excerpt(text, m, context=30)
        excerpts.append(snip)
    excerpt_str = " | ".join(excerpts)

    severity = Severity.CRITICAL if count > 3 else Severity.WARNING
    return [
        RuleViolation(
            rule_id="RCST-S01",
            severity=severity,
            title="Pronoms subjectifs prohibés",
            message=(
                f"{count} occurrence(s) de pronoms personnels/subjectifs détectées "
                f"(« nous », « je », « notre », « nos »). "
                "La Constitution RCST impose un style strictement impersonnel "
                "(tournures passives et nominales)."
            ),
            excerpt=excerpt_str,
            position=matches[0].start(),
        )
    ]


# ── RCST-C01 : Citations numériques entre crochets ────────────────────────────

_BRACKET_CITATION_PATTERN = re.compile(
    r"\[\s*\d+(?:\s*[,;–-]\s*\d+)*\s*\]",
    re.UNICODE,
)


def check_legacy_citations(text: str) -> List[RuleViolation]:
    """
    RCST-C01 — Détecte les crochets numériques [1], [2], [1,2] prohibés.
    Gravité : CRITICAL (la RCST exige exclusivement APA 7).
    """
    matches = list(_BRACKET_CITATION_PATTERN.finditer(text))
    if not matches:
        return []

    count = len(matches)
    examples = [m.group(0) for m in matches[:5]]
    return [
        RuleViolation(
            rule_id="RCST-C01",
            severity=Severity.CRITICAL,
            title="Citations numériques entre crochets interdites",
            message=(
                f"{count} citation(s) numérique(s) entre crochets détectée(s) : "
                f"{', '.join(examples)}. "
                "La Constitution RCST impose exclusivement le style APA 7e édition "
                "(ex: Mboma & Mabiala, 2015)."
            ),
            excerpt=", ".join(examples),
            position=matches[0].start(),
        )
    ]


# ── RCST-A01 : Présence et format ORCID ───────────────────────────────────────

# ORCID : 4 groupes de 4 chiffres, dernier chiffre peut être X
_ORCID_PATTERN = re.compile(
    r"\b(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\b",
    re.IGNORECASE,
)


def check_orcid_presence(text: str) -> List[RuleViolation]:
    """
    RCST-A01 — Vérifie la présence d'au moins un ORCID valide (format 16 chiffres).
    Gravité : CRITICAL si absent.
    """
    matches = list(_ORCID_PATTERN.finditer(text))
    if matches:
        # Validation secondaire : le dernier groupe peut contenir X majuscule/minuscule
        valid = [m for m in matches if re.match(r"\d{4}-\d{4}-\d{4}-\d{3}[\dXx]", m.group(0))]
        if valid:
            return []
    return [
        RuleViolation(
            rule_id="RCST-A01",
            severity=Severity.CRITICAL,
            title="Identifiant ORCID absent ou invalide",
            message=(
                "Aucun identifiant ORCID valide détecté dans le manuscrit. "
                "La Constitution RCST exige un ORCID (format 0000-0000-0000-000X) "
                "pour chaque auteur. Obtenez le vôtre sur https://orcid.org/register"
            ),
            excerpt="",
            position=None,
        )
    ]


# ── RCST-R01 : Résumé bilingue + mots-clés ────────────────────────────────────

# Blocs résumé FR / EN — patterns robustes
_RESUME_FR_PATTERN = re.compile(
    r"(?:^|\n)\s*r[ée]sum[ée]\s*:?\s*\n?([\s\S]*?)(?=\n\s*(?:mots.cl[ée]s|keywords|abstract|\d+[.\s]|introduction))",
    re.IGNORECASE,
)
_ABSTRACT_EN_PATTERN = re.compile(
    r"(?:^|\n)\s*abstract\s*:?\s*\n?([\s\S]*?)(?=\n\s*(?:keywords|mots.cl[ée]s|\d+[.\s]|introduction|1\.))",
    re.IGNORECASE,
)
_KEYWORDS_FR_PATTERN = re.compile(r"mots.cl[ée]s\s*:([^\n]{3,})", re.IGNORECASE)
_KEYWORDS_EN_PATTERN = re.compile(r"keywords\s*:([^\n]{3,})", re.IGNORECASE)


def check_bilingual_abstract(text: str) -> List[RuleViolation]:
    """
    RCST-R01 — Vérifie la présence des blocs Résumé (FR) + Abstract (EN)
    + Mots-clés (FR) + Keywords (EN).
    Gravité : CRITICAL si bloc manquant.
    """
    violations = []

    has_resume = bool(_RESUME_FR_PATTERN.search(text))
    has_abstract = bool(_ABSTRACT_EN_PATTERN.search(text))
    has_kw_fr = bool(_KEYWORDS_FR_PATTERN.search(text))
    has_kw_en = bool(_KEYWORDS_EN_PATTERN.search(text))

    missing = []
    if not has_resume:
        missing.append("Résumé (FR)")
    if not has_abstract:
        missing.append("Abstract (EN)")
    if not has_kw_fr:
        missing.append("Mots-clés (FR)")
    if not has_kw_en:
        missing.append("Keywords (EN)")

    if missing:
        violations.append(
            RuleViolation(
                rule_id="RCST-R01",
                severity=Severity.CRITICAL,
                title="Résumé bilingue incomplet",
                message=(
                    f"Blocs manquants : {', '.join(missing)}. "
                    "La Constitution RCST impose un résumé bilingue complet "
                    "(Résumé FR + Abstract EN) avec 5 mots-clés dans chaque langue."
                ),
                excerpt="",
                position=None,
            )
        )
    return violations


# ── RCST-R02 : Comptage de mots du résumé ─────────────────────────────────────

_ABSTRACT_MAX_WORDS = 250


def check_word_count(text: str) -> List[RuleViolation]:
    """
    RCST-R02 — Vérifie que chaque résumé (FR et EN) ne dépasse pas 250 mots.
    Gravité : CRITICAL si dépassement.
    """
    violations = []

    for lang, pattern, label in [
        ("fr", _RESUME_FR_PATTERN,   "Résumé (FR)"),
        ("en", _ABSTRACT_EN_PATTERN, "Abstract (EN)"),
    ]:
        m = pattern.search(text)
        if not m:
            continue
        body = m.group(1).strip() if m.lastindex and m.lastindex >= 1 else m.group(0).strip()
        count = _word_count(body)
        if count > _ABSTRACT_MAX_WORDS:
            violations.append(
                RuleViolation(
                    rule_id=f"RCST-R02-{lang.upper()}",
                    severity=Severity.CRITICAL,
                    title=f"Longueur du {label} dépassée",
                    message=(
                        f"Le {label} contient {count} mots "
                        f"(plafond strict : {_ABSTRACT_MAX_WORDS} mots selon la Constitution RCST). "
                        f"Réduire de {count - _ABSTRACT_MAX_WORDS} mot(s)."
                    ),
                    excerpt=body[:200] + "…" if len(body) > 200 else body,
                    position=m.start(),
                )
            )
    return violations


def _get_abstract_word_counts(text: str) -> Tuple[int, int]:
    """Retourne (nb_mots_FR, nb_mots_EN) pour les métriques du rapport."""
    fr_count = 0
    en_count = 0
    m_fr = _RESUME_FR_PATTERN.search(text)
    if m_fr:
        body = m_fr.group(1).strip() if m_fr.lastindex and m_fr.lastindex >= 1 else m_fr.group(0).strip()
        fr_count = _word_count(body)
    m_en = _ABSTRACT_EN_PATTERN.search(text)
    if m_en:
        body = m_en.group(1).strip() if m_en.lastindex and m_en.lastindex >= 1 else m_en.group(0).strip()
        en_count = _word_count(body)
    return fr_count, en_count


# ── RCST-F01 : Sections obligatoires de fin d'article ─────────────────────────

_MANDATORY_SECTIONS = [
    ("remerciements",        re.compile(r"\bremerciements?\b",                        re.IGNORECASE)),
    ("financement",          re.compile(r"\bfinancement\b|\bfunding\b",               re.IGNORECASE)),
    ("conflit_interet",      re.compile(r"\bconflit\s+d['']int[ée]r[êe]t\b|\bconflict\s+of\s+interest\b", re.IGNORECASE)),
    ("ethique",              re.compile(r"\bconsid[ée]rations?\s+[ée]thiques?\b|\bethical\s+considerations?\b", re.IGNORECASE)),
    ("contribution_auteurs", re.compile(r"\bcontribution\s+des\s+auteurs?\b|\bauthors?['']\s+contributions?\b", re.IGNORECASE)),
    ("orcid_auteurs",        _ORCID_PATTERN),
]

_SECTION_LABELS = {
    "remerciements":        "Remerciements",
    "financement":          "Financement",
    "conflit_interet":      "Conflit d'Intérêt",
    "ethique":              "Considérations Éthiques",
    "contribution_auteurs": "Contribution des Auteurs",
    "orcid_auteurs":        "Identifiants ORCID",
}


def check_final_sections(text: str) -> List[RuleViolation]:
    """
    RCST-F01 — Vérifie la présence des 6 sections obligatoires de fin d'article.
    Gravité : CRITICAL si 3+ manquantes, WARNING si 1-2 manquantes.
    """
    missing_keys = [
        key for key, pattern in _MANDATORY_SECTIONS
        if not pattern.search(text)
    ]

    if not missing_keys:
        return []

    missing_labels = [_SECTION_LABELS[k] for k in missing_keys]
    count = len(missing_keys)
    severity = Severity.CRITICAL if count >= 3 else Severity.WARNING

    return [
        RuleViolation(
            rule_id="RCST-F01",
            severity=severity,
            title="Sections obligatoires de fin d'article manquantes",
            message=(
                f"{count} section(s) obligatoire(s) introuvable(s) : "
                f"{', '.join(missing_labels)}. "
                "La Constitution RCST impose 6 sections finales dans tout article soumis."
            ),
            excerpt="",
            position=None,
        )
    ]


def _get_missing_sections(text: str) -> List[str]:
    """Retourne la liste des clés de sections absentes (pour les métriques)."""
    return [
        _SECTION_LABELS[key]
        for key, pattern in _MANDATORY_SECTIONS
        if not pattern.search(text)
    ]


# ── RCST-N01 : Numérotation des sections en chiffres arabes ───────────────────

_ROMAN_SECTION_PATTERN = re.compile(
    r"(?:^|\n)\s*(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s*[\.\-\)]\s+\w",
    re.MULTILINE,
)
_ARABIC_INTRO_PATTERN = re.compile(r"1\s*[\.\-]\s*introduction", re.IGNORECASE)


def check_section_numbering(text: str) -> List[RuleViolation]:
    """
    RCST-N01 — Interdit les chiffres romains pour les sections principales.
    Gravité : WARNING (souvent formatage hérité).
    """
    roman_matches = list(_ROMAN_SECTION_PATTERN.finditer(text))
    has_arabic = bool(_ARABIC_INTRO_PATTERN.search(text))

    if roman_matches and not has_arabic:
        examples = [m.group(0).strip() for m in roman_matches[:3]]
        return [
            RuleViolation(
                rule_id="RCST-N01",
                severity=Severity.WARNING,
                title="Numérotation romaine des sections prohibée",
                message=(
                    f"Sections numérotées en chiffres romains détectées : "
                    f"{', '.join(examples)}. "
                    "La Constitution RCST exige des chiffres arabes "
                    "(1. Introduction, 2. Méthodologie…)."
                ),
                excerpt=" | ".join(examples),
                position=roman_matches[0].start(),
            )
        ]
    return []


# ── RCST-A02 : Auteur correspondant (astérisque + téléphone) ──────────────────

_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", re.IGNORECASE)
_PHONE_PATTERN = re.compile(
    r"(\+243|\+\d{1,3}|0\d{2})[.\s\-]?\d{2,4}[.\s\-]?\d{2,4}[.\s\-]?\d{2,4}"
    r"|t[ée]l[ée]phone\s*:|tel\s*:|phone\s*:",
    re.IGNORECASE,
)
_ASTERISK_PATTERN = re.compile(r"\*\s*[Aa]uteur|[Aa]uteur\s*correspondant|\*\s*[Cc]orresponding", re.IGNORECASE)


def check_corresponding_author(text: str) -> List[RuleViolation]:
    """
    RCST-A02 — Vérifie la présence de l'astérisque de correspondance,
    d'un e-mail et d'un numéro de téléphone.
    Gravité : WARNING.
    """
    violations = []
    missing = []

    if not _ASTERISK_PATTERN.search(text):
        missing.append("astérisque de correspondance (*)")
    if not _EMAIL_PATTERN.search(text):
        missing.append("adresse e-mail de l'auteur correspondant")
    if not _PHONE_PATTERN.search(text):
        missing.append("numéro de téléphone de l'auteur correspondant")

    if missing:
        violations.append(
            RuleViolation(
                rule_id="RCST-A02",
                severity=Severity.WARNING,
                title="Coordonnées de l'auteur correspondant incomplètes",
                message=(
                    f"Éléments manquants : {', '.join(missing)}. "
                    "La Constitution RCST exige un auteur correspondant identifié "
                    "par (*) avec adresse e-mail, numéro de téléphone et ORCID."
                ),
                excerpt="",
                position=None,
            )
        )
    return violations


# ── RCST-T01 : Tableaux et figures ────────────────────────────────────────────

_TABLE_ROMAN_PATTERN = re.compile(r"\bTableau\s+(I{1,3}|IV|V{1,3}|VI{0,3}|IX|X)\b", re.IGNORECASE)
_TABLE_ARABIC_PATTERN = re.compile(r"\bTableau\s+\d+\b", re.IGNORECASE)
_FIGURE_ARABIC_PATTERN = re.compile(r"\bFigure\s+\d+\b", re.IGNORECASE)
_FIGURE_ROMAN_PATTERN = re.compile(r"\bFigure\s+(I{1,3}|IV|V{1,3}|VI{0,3}|IX|X)\b", re.IGNORECASE)


def check_tables_figures(text: str) -> List[RuleViolation]:
    """
    RCST-T01 — Tableaux numérotés en chiffres romains (AVANT),
    Figures en chiffres arabes (APRÈS).
    Gravité : WARNING.
    """
    violations = []

    if _TABLE_ARABIC_PATTERN.search(text) and not _TABLE_ROMAN_PATTERN.search(text):
        m = _TABLE_ARABIC_PATTERN.search(text)
        snip, pos = _excerpt(text, m)
        violations.append(
            RuleViolation(
                rule_id="RCST-T01a",
                severity=Severity.WARNING,
                title="Tableaux numérotés en chiffres arabes (RCST exige romains)",
                message=(
                    "Des tableaux sont numérotés avec des chiffres arabes (ex: Tableau 1). "
                    "La Constitution RCST impose les chiffres romains AVANT le tableau "
                    "(ex: Tableau I, placé avant les données)."
                ),
                excerpt=snip,
                position=pos,
            )
        )

    if _FIGURE_ROMAN_PATTERN.search(text):
        m = _FIGURE_ROMAN_PATTERN.search(text)
        snip, pos = _excerpt(text, m)
        violations.append(
            RuleViolation(
                rule_id="RCST-T01b",
                severity=Severity.WARNING,
                title="Figures numérotées en chiffres romains (RCST exige arabes)",
                message=(
                    "Des figures sont numérotées avec des chiffres romains. "
                    "La Constitution RCST impose les chiffres arabes APRÈS la figure "
                    "(ex: Figure 1, placée sous l'illustration)."
                ),
                excerpt=snip,
                position=pos,
            )
        )

    return violations


# ═══════════════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE PRINCIPAL
# ═══════════════════════════════════════════════════════════════════════════════

def run_all_rules(text: str) -> RulesReport:
    """
    Exécute toutes les règles déterministes sur le texte du manuscrit.
    Retourne un RulesReport complet et reproductible.

    Garantie de déterminisme :
    - Aucun état global mutable
    - Aucun appel réseau
    - Fonctions pures (regex compilées au niveau module)
    """
    report = RulesReport()
    all_rule_ids = [
        "RCST-S01", "RCST-C01", "RCST-A01", "RCST-R01",
        "RCST-R02-FR", "RCST-R02-EN", "RCST-F01",
        "RCST-N01", "RCST-A02", "RCST-T01a", "RCST-T01b",
    ]

    # Exécution de chaque règle
    rule_results = {
        "RCST-S01":     check_prohibited_pronouns(text),
        "RCST-C01":     check_legacy_citations(text),
        "RCST-A01":     check_orcid_presence(text),
        "RCST-R01":     check_bilingual_abstract(text),
        "RCST-R02":     check_word_count(text),
        "RCST-F01":     check_final_sections(text),
        "RCST-N01":     check_section_numbering(text),
        "RCST-A02":     check_corresponding_author(text),
        "RCST-T01":     check_tables_figures(text),
    }

    for key, violations in rule_results.items():
        report.violations.extend(violations)

    # Calcul des IDs "passés" (aucune violation pour cette règle)
    violated_ids = {v.rule_id for v in report.violations}
    report.passed = [rid for rid in all_rule_ids if rid not in violated_ids]

    # ── Métriques brutes ────────────────────────────────────────────────────
    pronoun_matches = list(_PRONOUN_PATTERN.finditer(text))
    report.pronoun_count = len(pronoun_matches)

    citation_matches = list(_BRACKET_CITATION_PATTERN.finditer(text))
    report.bracket_citation_count = len(citation_matches)

    orcid_matches = list(_ORCID_PATTERN.finditer(text))
    report.orcid_count = len(orcid_matches)

    report.abstract_word_count_fr, report.abstract_word_count_en = _get_abstract_word_counts(text)
    report.has_keywords_fr = bool(_KEYWORDS_FR_PATTERN.search(text))
    report.has_keywords_en = bool(_KEYWORDS_EN_PATTERN.search(text))
    report.missing_sections = _get_missing_sections(text)

    return report


# ── Calcul du score global à partir du rapport ────────────────────────────────

def compute_score_from_report(report: RulesReport) -> Tuple[int, str]:
    """
    Calcule un score global (0-100) et le statut de publication.
    Déterministe : même violations → même score.
    """
    score = 100
    score -= report.critical_count * 18
    score -= report.warning_count  * 7
    score = max(10, min(100, score))

    if report.critical_count >= 2:
        status = "Refusé - Modifications majeures requises"
    elif report.critical_count == 1 or report.warning_count >= 2:
        status = "Conforme avec réserves"
    else:
        status = "Conforme"

    return score, status
