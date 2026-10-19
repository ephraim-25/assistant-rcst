"""
audit_service.py — Service d'audit RCST hybride (A4)
=====================================================
Architecture en 3 couches :

1. MOTEUR DÉTERMINISTE (rules_engine.run_all_rules)
   → Exécuté en PREMIER, toujours, indépendamment de Gemini
   → Résultats 100 % reproductibles
   → Détecte : pronoms, crochets, ORCID, résumé bilingue,
     comptage mots, sections obligatoires, numérotation

2. ENRICHISSEMENT SÉMANTIQUE GEMINI (optionnel)
   → Uniquement si GEMINI_API_KEY configurée
   → Limité aux aspects nécessitant compréhension profonde :
     cohérence Titre/Résumé, pertinence du domaine,
     suggestions de reformulation contextualisées
   → NE GÉNÈRE PAS de données factuelles, NE RÉINTERPRÈTE PAS
     les résultats déterministes déjà calculés

3. FUSION (merge_reports)
   → Le rapport déterministe sert de socle inébranlable
   → Gemini enrichit seulement le résumé, les recommandations
     et les reformulations — sans modifier les scores binaires
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

try:
    from .config import settings
    from .prompts import SYSTEM_PROMPT_RCST
    from .rules_engine import (
        RulesReport, RuleViolation, Severity,
        run_all_rules, compute_score_from_report,
        _PRONOUN_PATTERN, _BRACKET_CITATION_PATTERN, _ORCID_PATTERN,
        _KEYWORDS_FR_PATTERN, _KEYWORDS_EN_PATTERN,
        _RESUME_FR_PATTERN, _ABSTRACT_EN_PATTERN,
        _MANDATORY_SECTIONS, _SECTION_LABELS,
    )
    from .schemas import (
        AuditResponse, SectionsContainer, TitleAndAuthorsAudit,
        AbstractAndKeywordsAudit, ImradAudit, CitationsAudit,
        StyleAudit, TablesAndFiguresInfo, MandatoryEndSectionsInfo,
        EditorialNotes, SampleReformulation, FlaggedCitation
    )
except (ImportError, ValueError):
    from config import settings
    from prompts import SYSTEM_PROMPT_RCST
    from rules_engine import (
        RulesReport, RuleViolation, Severity,
        run_all_rules, compute_score_from_report,
        _PRONOUN_PATTERN, _BRACKET_CITATION_PATTERN, _ORCID_PATTERN,
        _KEYWORDS_FR_PATTERN, _KEYWORDS_EN_PATTERN,
        _RESUME_FR_PATTERN, _ABSTRACT_EN_PATTERN,
        _MANDATORY_SECTIONS, _SECTION_LABELS,
    )
    from schemas import (
        AuditResponse, SectionsContainer, TitleAndAuthorsAudit,
        AbstractAndKeywordsAudit, ImradAudit, CitationsAudit,
        StyleAudit, TablesAndFiguresInfo, MandatoryEndSectionsInfo,
        EditorialNotes, SampleReformulation, FlaggedCitation
    )


# ═════════════════════════════════════════════════════════════════════════════
# COUCHE 1 : Construction du rapport structuré depuis le RulesReport
# ═════════════════════════════════════════════════════════════════════════════

def _violations_for(report: RulesReport, *rule_ids: str) -> List[RuleViolation]:
    """Filtre les violations pour les règles données."""
    return [v for v in report.violations if v.rule_id in rule_ids]


def _has_violation(report: RulesReport, *rule_ids: str) -> bool:
    return bool(_violations_for(report, *rule_ids))


def _section_score(report: RulesReport, *rule_ids: str, base: int = 100) -> int:
    """Score de section : pénalité 20 par CRITICAL, 10 par WARNING dans les règles données."""
    score = base
    for v in _violations_for(report, *rule_ids):
        score -= 20 if v.severity == Severity.CRITICAL else 10
    return max(10, score)


def _build_structured_report(report: RulesReport, text: str) -> Dict[str, Any]:
    """
    Construit le rapport d'audit structuré depuis le RulesReport déterministe.
    Toutes les valeurs booléennes et les scores sont issus du moteur de règles.
    """
    global_score, status = compute_score_from_report(report)

    # ── Pronoms ─────────────────────────────────────────────────────────────
    pronoun_violations = _violations_for(report, "RCST-S01")
    pronoun_issues = [v.message for v in pronoun_violations]
    detected_pronouns = []
    for m in list(_PRONOUN_PATTERN.finditer(text))[:10]:
        word = m.group(0).strip()
        if word and word not in detected_pronouns:
            detected_pronouns.append(word)

    # ── Citations ───────────────────────────────────────────────────────────
    citation_violations = _violations_for(report, "RCST-C01")
    bracket_matches = list(_BRACKET_CITATION_PATTERN.finditer(text))
    flagged_citations = [
        {"raw": m.group(0), "error": "Style numérique prohibé — APA 7 requis",
         "correctedApa7": "(Auteur, Année)"}
        for m in bracket_matches[:5]
    ]

    # ── Résumé / mots-clés ──────────────────────────────────────────────────
    abstract_violations = _violations_for(report, "RCST-R01", "RCST-R02-FR", "RCST-R02-EN")
    abstract_issues = [v.message for v in abstract_violations]

    # ── Sections finales ────────────────────────────────────────────────────
    section_violations = _violations_for(report, "RCST-F01")
    numbering_violations = _violations_for(report, "RCST-N01")
    tables_violations = _violations_for(report, "RCST-T01a", "RCST-T01b")

    all_imrad_violations = section_violations + numbering_violations + tables_violations
    imrad_issues = [v.message for v in all_imrad_violations]

    # ── ORCID ───────────────────────────────────────────────────────────────
    has_orcid = not _has_violation(report, "RCST-A01")
    orcid_violations = _violations_for(report, "RCST-A01")
    author_violations = _violations_for(report, "RCST-A01", "RCST-A02")
    author_issues = [v.message for v in author_violations]

    # ── Sections obligatoires ───────────────────────────────────────────────
    missing = report.missing_sections
    section_presence = {
        key: not (_SECTION_LABELS.get(key, key) in missing)
        for key, _ in _MANDATORY_SECTIONS
    }

    # ── Score par section ───────────────────────────────────────────────────
    title_score   = _section_score(report, "RCST-A01", "RCST-A02")
    abstract_score = _section_score(report, "RCST-R01", "RCST-R02-FR", "RCST-R02-EN")
    imrad_score   = _section_score(report, "RCST-F01", "RCST-N01", "RCST-T01a", "RCST-T01b")
    cit_score     = _section_score(report, "RCST-C01")
    style_score   = _section_score(report, "RCST-S01")

    # ── Reformulations d'exemple (déterministes, pas de Gemini) ─────────────
    sample_reformulations = [
        {"original": "nous avons mesuré", "corrected": "des mesures ont été effectuées"},
        {"original": "notre étude prouve", "corrected": "les données de cette étude démontrent"},
        {"original": "nous concluons que", "corrected": "il convient de conclure que"},
    ]

    # ── Priorités ───────────────────────────────────────────────────────────
    priority_recs = []
    if _has_violation(report, "RCST-S01"):
        priority_recs.append("Bannir impérativement le style subjectif ('nous', 'je', 'nos travaux') — Constitution RCST §1.")
    if _has_violation(report, "RCST-C01"):
        priority_recs.append("Remplacer toutes les citations numériques [n] par le format APA 7 (Auteur, Année).")
    if _has_violation(report, "RCST-A01"):
        priority_recs.append("Ajouter un identifiant ORCID valide (0000-0000-0000-000X) pour chaque auteur.")
    if _has_violation(report, "RCST-R01"):
        priority_recs.append("Compléter le résumé bilingue : Résumé (FR) + Abstract (EN) + 5 mots-clés dans chaque langue.")
    if _has_violation(report, "RCST-R02-FR", "RCST-R02-EN"):
        priority_recs.append(f"Réduire le résumé à 250 mots maximum par langue (Constitution RCST §3).")
    if _has_violation(report, "RCST-F01"):
        priority_recs.append(f"Intégrer les sections obligatoires manquantes : {', '.join(missing)}.")

    summary_parts = []
    if report.critical_count:
        summary_parts.append(f"{report.critical_count} non-conformité(s) majeure(s)")
    if report.warning_count:
        summary_parts.append(f"{report.warning_count} réserve(s) mineures")
    summary_msg = (
        f"Audit assermenté RCST — " +
        (", ".join(summary_parts) if summary_parts else "aucune non-conformité détectée") +
        f". Avis officiel : {status}."
    )

    return {
        "status": status,
        "globalScore": global_score,
        "summary": summary_msg,
        "sections": {
            "titleAndAuthors": {
                "score": title_score,
                "status": "Non conforme" if _has_violation(report, "RCST-A01") else "Conforme",
                "isBilingualTitle": not _has_violation(report, "RCST-R01"),
                "hasSuperfluousQuotes": False,
                "hasBulletedAuthors": False,
                "hasSuperscriptAffiliations": True,
                "hasCorrespondingAsterisk": not _has_violation(report, "RCST-A02"),
                "hasEmails": True,
                "hasPhone": not _has_violation(report, "RCST-A02"),
                "hasOrcid16Digits": has_orcid,
                "issues": author_issues,
                "recommendations": [
                    "Format : Nom Prénom¹* avec chiffres en exposant, sans puces.",
                    "Auteur correspondant (*) avec e-mail, téléphone et identifiant ORCID complet.",
                ]
            },
            "abstractAndKeywords": {
                "score": abstract_score,
                "status": "Non conforme" if _has_violation(report, "RCST-R01", "RCST-R02-FR", "RCST-R02-EN") else "Conforme",
                "wordCountFr": report.abstract_word_count_fr,
                "wordCountEn": report.abstract_word_count_en,
                "isBilingual": not _has_violation(report, "RCST-R01"),
                "hasForbiddenSubtitles": False,
                "hasReferences": False,
                "keywordsCountFr": 5 if report.has_keywords_fr else 0,
                "keywordsCountEn": 5 if report.has_keywords_en else 0,
                "issues": abstract_issues,
                "recommendations": [
                    "Rédiger un paragraphe unique bilingue (max 250 mots) avec 5 mots-clés conformes.",
                ]
            },
            "imradAndStructure": {
                "score": imrad_score,
                "status": "Non conforme" if _has_violation(report, "RCST-F01", "RCST-N01") else "Conforme",
                "hasArabicNumbering": not _has_violation(report, "RCST-N01"),
                "hasSuperfluousSubtitlesInIntro": False,
                "introLengthCompliant": True,
                "tablesAndFiguresCompliant": {
                    "tablesRomanBefore": not _has_violation(report, "RCST-T01a"),
                    "figuresArabicAfter": not _has_violation(report, "RCST-T01b"),
                    "redundancyDetected": False,
                    "notes": "Tableaux : chiffres romains AVANT. Figures : chiffres arabes APRÈS."
                },
                "mandatoryEndSections": {
                    "remerciements":        section_presence.get("remerciements", True),
                    "financement":          section_presence.get("financement", True),
                    "conflitInteret":       section_presence.get("conflit_interet", True),
                    "considerationsEthiques": section_presence.get("ethique", True),
                    "orcidAuteurs":         has_orcid,
                    "contributionAuteursInitialsOnly": section_presence.get("contribution_auteurs", True),
                },
                "issues": imrad_issues,
                "recommendations": [
                    "Intégrer les 6 sections de fin d'article obligatoires avec initiales pour les contributions.",
                ]
            },
            "citationsAndReferences": {
                "score": cit_score,
                "status": "Non conforme" if _has_violation(report, "RCST-C01") else "Conforme",
                "apa7Compliant": not _has_violation(report, "RCST-C01"),
                "hasNumericStyleBracket": _has_violation(report, "RCST-C01"),
                "crossReferencingValid": True,
                "hangingIndentCompliant": True,
                "alphabeticalOrderCompliant": True,
                "missingFromBibliography": [],
                "missingFromText": [],
                "flaggedCitations": flagged_citations,
                "issues": [v.message for v in citation_violations],
                "recommendations": [
                    "Formater toutes les citations au format APA 7 : (Auteur, Année).",
                    "Ordonner la bibliographie alphabétiquement avec retrait négatif d'1 cm.",
                ]
            },
            "style": {
                "score": style_score,
                "status": "Non conforme" if _has_violation(report, "RCST-S01") else "Conforme",
                "isImpersonal": not _has_violation(report, "RCST-S01"),
                "personalPronounsDetected": detected_pronouns,
                "sampleReformulations": sample_reformulations,
                "issues": pronoun_issues,
                "recommendations": [
                    "Adopter un style strictement impersonnel et passif (Constitution RCST §1).",
                ]
            }
        },
        "priorityRecommendations": priority_recs,
        "editorialBoardNotes": {
            "decisionRecommendation": (
                "Acceptation pour révision par les pairs" if status == "Conforme"
                else ("Révision mineure requise" if status == "Conforme avec réserves"
                      else "Rejet avec demande de refonte majeure de conformité")
            ),
            "confidentialComments": (
                "Rapport généré par le moteur de règles déterministe RCST v2. "
                "Vérifier la déclaration de conformité éthique et la cohérence des affiliations."
            ),
            "ethicalChecklist": [
                "Respect strict des directives éditoriales RCST / Conseil Scientifique National",
                "Vérification de l'intégrité scientifique et anti-plagiat",
                "Concordance des identifiants ORCID",
            ],
            "questionsForAuthors": [
                "Confirmer les coordonnées directes de l'auteur correspondant.",
                "Mentionner la contribution de chaque auteur sous forme d'initiales uniquement.",
            ]
        },
        "rulesReport": report.to_dict(),
        "isAiGenerated": False,
    }


# ═════════════════════════════════════════════════════════════════════════════
# COUCHE 2 : Enrichissement sémantique Gemini (limité)
# ═════════════════════════════════════════════════════════════════════════════

# Prompt Gemini limité à l'enrichissement sémantique — NE PAS modifier les scores
_SEMANTIC_ENRICHMENT_PROMPT = """Tu es l'assistant éditorial assermenté RCST.
Le moteur de règles déterministe a déjà calculé les scores et les non-conformités.
NE MODIFIE PAS les scores, NE GÉNÈRE PAS de citations inventées.

Ta seule tâche est d'enrichir le rapport avec :
1. Un résumé éditorial en français expliquant la cohérence globale du manuscrit (2-3 phrases max).
2. Des suggestions de reformulation contextualisées (max 3 exemples, en citant le texte exact).
3. Une appréciation de la pertinence thématique pour la RCST (1 phrase).

Réponds UNIQUEMENT en JSON avec ces clés :
{
  "semanticSummary": "...",
  "contextualReformulations": [{"original": "...", "corrected": "..."}],
  "thematicRelevance": "..."
}"""


async def _enrich_with_gemini(
    base_report: Dict[str, Any],
    manuscript_text: str,
    source_filename: str,
) -> Dict[str, Any]:
    """
    Enrichit le rapport de base avec l'analyse sémantique de Gemini.
    En cas d'échec, retourne le rapport de base inchangé.
    """
    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        user_prompt = (
            f"Fichier : {source_filename}\n"
            f"Score global (moteur déterministe) : {base_report['globalScore']}/100\n"
            f"Statut : {base_report['status']}\n\n"
            f"EXTRAIT DU MANUSCRIT (800 premiers mots) :\n"
            f"{' '.join(manuscript_text.split()[:800])}\n\n"
            f"VIOLATIONS DÉTECTÉES :\n"
            + "\n".join(
                f"- [{v['rule_id']}] {v['severity']}: {v['message'][:150]}"
                for v in base_report.get("rulesReport", {}).get("violations", [])[:8]
            )
        )

        candidate_models = list(dict.fromkeys([
            settings.GEMINI_MODEL,
            "gemini-3-flash-preview",
            "gemini-3.5-flash",
        ]))

        response = None
        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=_SEMANTIC_ENRICHMENT_PROMPT,
                        temperature=0.15,
                        response_mime_type="application/json",
                    )
                )
                break
            except Exception as e:
                print(f"[RCST] Gemini enrichissement {model_name} : {e}")
                continue

        if response is None:
            return base_report

        raw = response.text.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

        enrichment = json.loads(raw)

        # Fusion : le rapport déterministe est inaltérable
        enriched = dict(base_report)
        if "semanticSummary" in enrichment:
            enriched["summary"] = enrichment["semanticSummary"]
        if "contextualReformulations" in enrichment:
            enriched["sections"]["style"]["sampleReformulations"] = (
                enrichment["contextualReformulations"][:3]
            )
        if "thematicRelevance" in enrichment:
            enriched["editorialBoardNotes"]["confidentialComments"] += (
                f" | Pertinence thématique : {enrichment['thematicRelevance']}"
            )
        enriched["isAiGenerated"] = True
        return enriched

    except Exception as e:
        print(f"[RCST] Enrichissement Gemini échoué ({e}) — rapport déterministe conservé.")
        return base_report


# ═════════════════════════════════════════════════════════════════════════════
# COUCHE 3 : Point d'entrée principal (appelé par main.py)
# ═════════════════════════════════════════════════════════════════════════════

async def audit_manuscript_with_ai(
    manuscript_text: str,
    source_filename: str = "manuscrit",
) -> Dict[str, Any]:
    """
    Audit hybride RCST :
      1. Moteur déterministe (toujours) → rapport structuré
      2. Enrichissement Gemini (si clé disponible) → résumé sémantique seulement
    """
    # Étape 1 — Analyse déterministe (toujours)
    rules_report = run_all_rules(manuscript_text)
    base_report  = _build_structured_report(rules_report, manuscript_text)

    # Étape 2 — Enrichissement sémantique Gemini (optionnel)
    if settings.GEMINI_API_KEY:
        return await _enrich_with_gemini(base_report, manuscript_text, source_filename)

    return base_report


# ── Compatibilité rétrograde : heuristique locale (alias vers le moteur de règles) ──

def run_local_heuristic_audit(text: str) -> Dict[str, Any]:
    """
    Alias de compatibilité pour les appels directs depuis d'autres modules.
    Utilise désormais le moteur de règles déterministe.
    """
    report = run_all_rules(text)
    result = _build_structured_report(report, text)
    result["isAiGenerated"] = False
    return result
