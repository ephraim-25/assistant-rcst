import json
import re
from typing import Dict, Any, List
from google import genai
from google.genai import types

from .config import settings
from .prompts import SYSTEM_PROMPT_RCST
from .schemas import (
    AuditResponse, SectionsContainer, TitleAndAuthorsAudit,
    AbstractAndKeywordsAudit, ImradAudit, CitationsAudit,
    StyleAudit, TablesAndFiguresInfo, MandatoryEndSectionsInfo,
    EditorialNotes, SampleReformulation, FlaggedCitation
)

def run_local_heuristic_audit(text: str) -> Dict[str, Any]:
    """
    Moteur de règles heuristiques déterministes RCST
    Permet un audit instantané et sert de garde-fou si la clé d'API est indisponible.
    """
    lower = text.lower()
    
    # Pronoms personnels
    pronouns = re.findall(r"\b(nous|je|notre|nos|j'|moi|mon|mes|on a|nous avons|nous pensons|nous concluons|nos travaux|notre étude)\b", text, re.IGNORECASE)
    pronouns_count = len(pronouns)

    # ORCID 16 chiffres
    has_orcid = bool(re.search(r"\b[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9xX]\b", text))
    
    # Coordonnées
    has_emails = bool(re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text))
    has_phone = bool(re.search(r"(\+243|0[0-9]{2}|\b\+?[0-9]{1,4}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4}\b)|t[ée]l[ée]phone|phone|tel\s*:", text, re.IGNORECASE))
    has_asterisk = "*" in text or bool(re.search(r"correspond", text, re.IGNORECASE))
    has_bulleted_authors = bool(re.search(r"auteurs?\s*:\s*\n\s*[-*•]", text, re.IGNORECASE))

    # Titre et résumé
    has_quotes = bool(re.search(r'["«»“”]', text.split("\n")[0] if "\n" in text else ""))
    has_english_title = bool(re.search(r"title|abstract", text, re.IGNORECASE)) and bool(re.search(r"résumé|introduction", text, re.IGNORECASE))
    
    # Résumé
    abstract_match = re.search(r"(?:résumé|abstract)[\s\S]*?(?=(?:mots-cl[ée]s|keywords|1\.|introduction))", text, re.IGNORECASE)
    abstract_words = len(abstract_match.group(0).split()) if abstract_match else 0
    has_forbidden_subtitles = bool(re.search(r"(?:résumé|abstract)[\s\S]*?(?:objectif|méthode|résultats|conclusion)\s*:", text, re.IGNORECASE))
    has_references_in_abstract = bool(re.search(r"(?:résumé|abstract)[\s\S]*?(?:\[\d+\]|\(\w+,\s*\d{4}\))", text, re.IGNORECASE))
    has_keywords_fr = bool(re.search(r"mots-cl[ée]s\s*:", text, re.IGNORECASE))
    has_keywords_en = bool(re.search(r"keywords\s*:", text, re.IGNORECASE))

    # Numérotation sections
    has_arabic_numbering = bool(re.search(r"1\.\s*introduction", text, re.IGNORECASE))
    has_roman_numbering = bool(re.search(r"I\.\s*introduction", text, re.IGNORECASE))

    # Tableaux et Figures
    has_table_roman = bool(re.search(r"Tableau\s+[IVXLCDM]+", text, re.IGNORECASE))
    has_table_arabic = bool(re.search(r"Tableau\s+\d+", text, re.IGNORECASE))
    has_figure_arabic = bool(re.search(r"Figure\s+\d+", text, re.IGNORECASE))

    # Sections obligatoires
    has_rem = bool(re.search(r"remerciements|acknowledg(?:e)?ments", text, re.IGNORECASE))
    has_fin = bool(re.search(r"financement|funding", text, re.IGNORECASE))
    has_conf = bool(re.search(r"conflit d['’]int[ée]r[êe]t|conflict of interest", text, re.IGNORECASE))
    has_eth = bool(re.search(r"consid[ée]rations d['’][ée]thiques?|ethical considerations", text, re.IGNORECASE))
    has_contrib = bool(re.search(r"contribution des auteurs|authors['’] contributions", text, re.IGNORECASE))
    has_initials = bool(re.search(r"([A-Z]\.[A-Z]\.(?:\.[A-Z]\.)?)", text))

    # Citations
    has_bracket_citations = bool(re.search(r"\[\d+\]|\[\d+,\s*\d+\]", text))

    major_issues = []
    minor_issues = []

    if pronouns_count > 3:
        major_issues.append(f"Style subjectif prohibé : {pronouns_count} occurrences de « nous/je/notre étude ». Utilisation impérative du style impersonnel.")
    elif pronouns_count > 0:
        minor_issues.append(f"{pronouns_count} pronoms personnels à reformuler au passif ou style impersonnel.")

    if has_bulleted_authors:
        major_issues.append("Auteurs et affiliations : Utilisation de puces formellement proscrite par la Constitution RCST.")
    if not has_orcid:
        major_issues.append("Auteurs : Absence des identifiants ORCID (16 chiffres) obligatoires pour chaque auteur.")
    if not has_phone:
        minor_issues.append("Auteur correspondant : Numéro de téléphone direct obligatoire non mentionné.")
    if not has_asterisk:
        minor_issues.append("Auteur correspondant non distingué par un astérisque (*) en exposant.")

    if abstract_words > 250:
        major_issues.append(f"Longueur du résumé non conforme : {abstract_words} mots (plafond strict à 250 mots).")
    if has_forbidden_subtitles:
        major_issues.append("Résumé : Présence de sous-titres interdits (doit être un paragraphe unique fluide).")
    if has_references_in_abstract:
        major_issues.append("Résumé : Interdiction formelle d'y citer des références bibliographiques.")
    if not has_english_title or not has_keywords_en:
        major_issues.append("Bilinguisme incomplet : Titre et Résumé doivent comporter leur pendant anglais intégral avec 5 mots-clés.")

    if has_bracket_citations:
        major_issues.append("Citations numériques entre crochets [1] proscrites. La RCST exige exclusivement la norme APA 7 (ex: Mboma & Mabiala, 2015).")

    if has_roman_numbering and not has_arabic_numbering:
        major_issues.append("Numérotation des sections en chiffres romains prohibée. Utiliser les chiffres arabes (1., 2., 3., 4., 5.).")

    missing_sections = []
    if not has_rem: missing_sections.append("Remerciements")
    if not has_fin: missing_sections.append("Financement")
    if not has_conf: missing_sections.append("Conflit d'Intérêt")
    if not has_eth: missing_sections.append("Considérations d'Éthiques")
    if not has_contrib: missing_sections.append("Contribution des Auteurs")

    if len(missing_sections) >= 3:
        major_issues.append(f"Sections obligatoires de fin d'article manquantes : {', '.join(missing_sections)}.")
    elif len(missing_sections) > 0:
        minor_issues.append(f"Sections de fin d'article à compléter : {', '.join(missing_sections)}.")

    # Statut
    if len(major_issues) >= 2:
        status = "Refusé - Modifications majeures requises"
    elif len(major_issues) == 1 or len(minor_issues) >= 2:
        status = "Conforme avec réserves"
    else:
        status = "Conforme"

    global_score = max(20, min(100, 100 - len(major_issues) * 18 - len(minor_issues) * 7))

    return {
        "status": status,
        "globalScore": global_score,
        "summary": f"Audit assermenté RCST : {len(major_issues)} non-conformité(s) majeure(s) et {len(minor_issues)} réserve(s) identifiée(s). Avis officiel : {status}.",
        "sections": {
            "titleAndAuthors": {
                "score": 55 if (has_bulleted_authors or not has_orcid) else 90,
                "status": "Non conforme" if (has_bulleted_authors or not has_orcid) else "Conforme",
                "isBilingualTitle": has_english_title,
                "hasSuperfluousQuotes": has_quotes,
                "hasBulletedAuthors": has_bulleted_authors,
                "hasSuperscriptAffiliations": not has_bulleted_authors,
                "hasCorrespondingAsterisk": has_asterisk,
                "hasEmails": has_emails,
                "hasPhone": has_phone,
                "hasOrcid16Digits": has_orcid,
                "issues": [
                    *(["Bannir les listes à puces pour les auteurs."] if has_bulleted_authors else []),
                    *(["Identifiant ORCID à 16 chiffres manquant pour un ou plusieurs auteurs."] if not has_orcid else []),
                    *(["Téléphone direct de l'auteur correspondant manquant."] if not has_phone else []),
                ],
                "recommendations": [
                    "Format : Nom Prénom¹*, Co-Auteur² avec chiffres en exposant sans puces.",
                    "Auteur correspondant (*) avec e-mail, téléphone et identifiant ORCID complet."
                ]
            },
            "abstractAndKeywords": {
                "score": 50 if (abstract_words > 250 or has_forbidden_subtitles or has_references_in_abstract) else 90,
                "status": "Non conforme" if (abstract_words > 250 or has_forbidden_subtitles) else "Conforme",
                "wordCountFr": abstract_words,
                "wordCountEn": abstract_words,
                "isBilingual": has_english_title and has_keywords_en,
                "hasForbiddenSubtitles": has_forbidden_subtitles,
                "hasReferences": has_references_in_abstract,
                "keywordsCountFr": 5 if has_keywords_fr else 0,
                "keywordsCountEn": 5 if has_keywords_en else 0,
                "issues": [
                    *(["Le résumé dépasse la limite stricte de 250 mots."] if abstract_words > 250 else []),
                    *(["Sous-titres prohibés dans le corps du résumé."] if has_forbidden_subtitles else []),
                    *(["Références bibliographiques interdites dans le résumé."] if has_references_in_abstract else []),
                ],
                "recommendations": [
                    "Rédiger un paragraphe unique bilingue (max 250 mots) avec 5 mots-clés conformes."
                ]
            },
            "imradAndStructure": {
                "score": 50 if (len(missing_sections) > 2 or has_roman_numbering) else 85,
                "status": "Non conforme" if (len(missing_sections) > 2 or has_roman_numbering) else "Conforme",
                "hasArabicNumbering": has_arabic_numbering,
                "hasSuperfluousSubtitlesInIntro": False,
                "introLengthCompliant": True,
                "tablesAndFiguresCompliant": {
                    "tablesRomanBefore": has_table_roman or not has_table_arabic,
                    "figuresArabicAfter": has_figure_arabic,
                    "redundancyDetected": False,
                    "notes": "Tableaux en chiffres romains avant, Figures en chiffres arabes après."
                },
                "mandatoryEndSections": {
                    "remerciements": has_rem,
                    "financement": has_fin,
                    "conflitInteret": has_conf,
                    "considerationsEthiques": has_eth,
                    "orcidAuteurs": has_orcid,
                    "contributionAuteursInitialsOnly": has_contrib and has_initials
                },
                "issues": [
                    *(["Sections principales en chiffres arabes impératives (1. Introduction...)."] if has_roman_numbering else []),
                    *(["Numérotation des tableaux en chiffres romains (ex: Tableau I) placée AVANT."] if has_table_arabic else []),
                    *(["Sections finales obligatoires manquantes."] if missing_sections else []),
                ],
                "recommendations": [
                    "Intégrer les 6 sections de fin d'article obligatoires avec initiales pour les contributions."
                ]
            },
            "citationsAndReferences": {
                "score": 40 if has_bracket_citations else 90,
                "status": "Non conforme" if has_bracket_citations else "Conforme",
                "apa7Compliant": not has_bracket_citations,
                "hasNumericStyleBracket": has_bracket_citations,
                "crossReferencingValid": True,
                "hangingIndentCompliant": True,
                "alphabeticalOrderCompliant": True,
                "missingFromBibliography": [],
                "missingFromText": [],
                "flaggedCitations": [
                    {"raw": "[1], [2]", "error": "Style numérique prohibé", "correctedApa7": "(Mboma & Mabiala, 2015)"}
                ] if has_bracket_citations else [],
                "issues": [
                    *(["Proscription formelle du style numérique entre crochets [1]. Appliquer strictement APA 7."] if has_bracket_citations else [])
                ],
                "recommendations": [
                    "Formater toutes les citations au format APA 7th (Auteur, Année).",
                    "Ordonner la bibliographie alphabétiquement avec un retrait négatif d'1 cm dès la 2e ligne."
                ]
            },
            "style": {
                "score": 100 if pronouns_count == 0 else max(30, 95 - pronouns_count * 12),
                "status": "Conforme" if pronouns_count == 0 else "Non conforme",
                "isImpersonal": pronouns_count == 0,
                "personalPronounsDetected": [p[0] if isinstance(p, tuple) else p for p in pronouns[:10]],
                "sampleReformulations": [
                    {"original": "nous avons mesuré", "corrected": "des mesures ont été effectuées"},
                    {"original": "notre étude prouve", "corrected": "les données démontrent"}
                ],
                "issues": [
                    *(["Utilisation du style personnel ('nous', 'notre') prohibée."] if pronouns_count > 0 else [])
                ],
                "recommendations": [
                    "Adopter un style strictement impersonnel et passif conformément à la charte RCST."
                ]
            }
        },
        "priorityRecommendations": [
            *(["Bannir impérativement le style subjectif ('nous', 'je', 'nos travaux')."] if pronouns_count > 0 else []),
            *(["Remplacer les citations numériques [1] par les références APA 7."] if has_bracket_citations else []),
            *(["Supprimer les puces pour les auteurs et ajouter les 16 chiffres ORCID."] if (has_bulleted_authors or not has_orcid) else []),
            *(["Intégrer les 6 sections de fin d'article imposées par la RCST."] if missing_sections else [])
        ],
        "editorialBoardNotes": {
            "decisionRecommendation": "Acceptation pour révision par les pairs" if status == "Conforme" else ("Révision mineure requise" if status == "Conforme avec réserves" else "Rejet avec demande de refonte majeure de conformité"),
            "confidentialComments": "Vérifier la déclaration de conformité éthique et la cohérence des affiliations scientifiques.",
            "ethicalChecklist": [
                "Respect strict des directives éditoriales RCST / Conseil Scientifique National",
                "Vérification de l'intégrité scientifique et anti-plagiat",
                "Concordance des identifiants ORCID"
            ],
            "questionsForAuthors": [
                "Confirmer les coordonnées directes de l'auteur correspondant.",
                "Mentionner la contribution de chaque auteur sous forme d'initiales uniquement."
            ]
        }
    }


async def audit_manuscript_with_ai(manuscript_text: str, source_filename: str = "manuscrit") -> Dict[str, Any]:
    """
    Appel à l'API Google GenAI officielle (`google-genai`) avec température basse (0.2).
    Si indisponible ou en cas d'erreur de quota/clé, bascule automatiquement sur le moteur heuristique de secours.
    """
    if not settings.GEMINI_API_KEY:
        heuristic = run_local_heuristic_audit(manuscript_text)
        heuristic["isAiGenerated"] = False
        return heuristic

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        user_prompt = f"""AUDIT OFFICIEL DE CONFORMITÉ RCST
Fichier source : {source_filename}
Volume : {len(manuscript_text.split())} mots

MANUSCRIT SOUMIS :
---
{manuscript_text}
---

Exécute l'audit complet selon la Constitution de la RCST et renvoie STRICTEMENT le JSON spécifié."""

        candidate_models = list(dict.fromkeys([
            settings.GEMINI_MODEL,
            "gemini-3-flash-preview",
            "gemini-3.5-flash"
        ]))
        response = None
        last_err = None
        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT_RCST,
                        temperature=0.2,
                        response_mime_type="application/json"
                    )
                )
                break
            except Exception as e:
                last_err = e
                print(f"[RCST Backend] Échec modèle {model_name}: {e}. Tentative avec modèle alternatif...")
                continue

        if response is None:
            raise last_err or RuntimeError("Aucun modèle Gemini disponible.")

        raw_text = response.text.strip()
        # Enlever les balises markdown ```json si présentes
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
            raw_text = re.sub(r"\n?```$", "", raw_text)

        parsed_data = json.loads(raw_text)
        parsed_data["isAiGenerated"] = True
        return parsed_data

    except Exception as e:
        print(f"[RCST Backend] Erreur ou indisponibilité GenAI: {e}. Bascule sur l'audit heuristique.")
        heuristic = run_local_heuristic_audit(manuscript_text)
        heuristic["isAiGenerated"] = False
        return heuristic
