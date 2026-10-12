import os
import json as _json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .config import settings
from .extractor import extract_text_from_file
from .audit_service import audit_manuscript_with_ai
from .schemas import AuditRequest, AuditResponse, TextExtractionResponse

app = FastAPI(
    title="RCST Editorial Compliance & Audit API",
    description="Plateforme officielle d'audit éditorial et de contrôle de conformité pour la Revue Congolaise des Sciences & Technologies (RCST) - Conseil Scientifique National RDC.",
    version="1.0.0"
)

# Configuration CORS pour autoriser le frontend (Vite / Next.js / React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],  # Autorise localhost & environnements dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Vérification de l'état du serveur backend."""
    return {
        "status": "healthy",
        "service": "RCST Editorial Audit Engine",
        "hasGeminiKey": bool(settings.GEMINI_API_KEY),
        "environment": settings.ENVIRONMENT
    }

@app.post("/api/extract-file", response_model=TextExtractionResponse)
async def extract_file_endpoint(file: UploadFile = File(...)):
    """
    Extrait le texte brut d'un manuscrit (.docx, .pdf, .txt, .md).
    Gère les erreurs d'encodage et calcule le volume de mots.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun fichier soumis."
        )

    filename = file.filename or "manuscrit"
    try:
        content_bytes = await file.read()
        extracted_text, ext = extract_text_from_file(content_bytes, filename)
        
        words = len(extracted_text.split())
        return TextExtractionResponse(
            text=extracted_text,
            filename=filename,
            extension=ext,
            sizeBytes=len(content_bytes),
            wordCount=words,
            message=f"Document '{filename}' extrait avec succès ({words} mots). Prêt pour l'audit RCST."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'extraction du document : {str(e)}"
        )


@app.post("/api/audit")
async def audit_endpoint(payload: AuditRequest):
    """
    Route principale d'audit de conformité RCST :
    - Évalue le manuscrit selon la Constitution RCST (IMRAD, APA 7, style impersonnel, auteurs, affiliations, etc.)
    - Interfaçage Google GenAI (température 0.2) avec bascule automatique heuristique de secours.
    - Retourne le rapport d'audit officiel structuré.
    """
    text = payload.manuscriptText.strip()
    if len(text) < 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le contenu du manuscrit est trop court ou vide pour effectuer un audit éditorial."
        )

    try:
        audit_result = await audit_manuscript_with_ai(
            manuscript_text=text,
            source_filename=payload.sourceFilename or "manuscrit"
        )
        return audit_result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'audit du manuscrit : {str(e)}"
        )


class ReformulateRequest(BaseModel):
    textToReformulate: str

class ApaConvertRequest(BaseModel):
    referenceString: str


def _generate_with_fallback(client, contents, config):
    candidate_models = list(dict.fromkeys([
        settings.GEMINI_MODEL,
        "gemini-3-flash-preview",
        "gemini-3.5-flash"
    ]))
    last_err = None
    for m in candidate_models:
        try:
            return client.models.generate_content(
                model=m,
                contents=contents,
                config=config
            )
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Aucun modèle Gemini disponible.")


@app.post("/api/reformulate-style")
async def reformulate_style_endpoint(payload: ReformulateRequest):
    """
    Reformule un passage en style impersonnel strict conforme à la Constitution RCST.
    Utilise google-genai (gemini-2.5-flash avec fallback automatique) ou un correcteur local de secours.
    """
    from .config import settings

    text = payload.textToReformulate.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texte à reformuler manquant.")

    # Correcteur local basique si pas de clé
    if not settings.GEMINI_API_KEY:
        import re
        result = text
        replacements = [
            (r"\bnous avons constaté que\b", "il a été constaté que"),
            (r"\bnous avons analysé\b", "l'analyse a porté sur"),
            (r"\bnous pensons que\b", "les éléments suggèrent que"),
            (r"\bnotre étude montre\b", "cette étude démontre"),
            (r"\bnous concluons que\b", "il convient de conclure que"),
            (r"\bnos travaux\b", "les investigations antérieures"),
            (r"\bnous\b", "les auteurs"),
        ]
        for pattern, repl in replacements:
            result = re.sub(pattern, repl, result, flags=re.IGNORECASE)
        return {
            "rephrased": result,
            "explanations": ["Remplacement systématique des marques de subjectivité par des tournures passives ou nominales."]
        }

    try:
        from google import genai
        from google.genai import types
        import json

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""Réécris le passage suivant dans le style impersonnel strict exigé par la Constitution de la Revue Congolaise des Sciences & Technologies (RCST).
Bannis catégoriquement « nous », « je », « notre », « nos », « nos travaux ». Utilise des tournures passives, impersonnelles ou nominales de haute tenue scientifique.

Passage :
\"{text}\"

Réponds au format JSON :
{{
  "rephrased": "texte réécrit",
  "explanations": ["liste d'explications sur les changements apportés"]
}}"""
        response = _generate_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1, response_mime_type="application/json")
        )
        return json.loads(response.text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur reformulation : {str(e)}")


@app.post("/api/convert-apa")
async def convert_apa_endpoint(payload: ApaConvertRequest):
    """
    Convertit une référence bibliographique au format APA 7e édition conforme à la RCST.
    """
    from .config import settings

    ref = payload.referenceString.strip()
    if not ref:
        raise HTTPException(status_code=400, detail="Référence bibliographique manquante.")

    if not settings.GEMINI_API_KEY:
        return {
            "apaFormatted": ref,
            "inTextCitationParenthetical": "(Auteur, 2024)",
            "inTextCitationNarrative": "Auteur (2024)",
            "notes": "Clé API absente — formatage préliminaire non appliqué."
        }

    try:
        from google import genai
        from google.genai import types
        import json

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""Convertis cette référence bibliographique selon les normes APA 7ème édition exigées par la Revue Congolaise des Sciences & Technologies (RCST).
Règles : ordre des auteurs (Nom, Initiale.), année entre parenthèses, titre de revue en italique, volume en italique, retrait négatif d'1 cm, lien DOI actif si disponible.

Référence source : \"{ref}\"

Réponds en JSON :
{{
  "apaFormatted": "référence formatée en APA 7 complet",
  "inTextCitationParenthetical": "ex: (Mboma & Mabiala, 2015)",
  "inTextCitationNarrative": "ex: Mboma et Mabiala (2015)",
  "notes": "corrections apportées"
}}"""
        response = _generate_with_fallback(
            client=client,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1, response_mime_type="application/json")
        )
        return json.loads(response.text.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur conversion APA : {str(e)}")



# ─── /api/chat ────────────────────────────────────────────────────────────────

_CHAT_SYSTEM_PROMPT = """Tu es l'assistant éditorial expert et assermenté de la Revue Congolaise des Sciences & Technologies (RCST), sous l'égide du Conseil Scientifique National (RDC).

Ton rôle est d'aider les auteurs et éditeurs à comprendre précisément les non-conformités de leur manuscrit et à les corriger, en appliquant rigoureusement la Constitution de la RCST.

DIRECTIVES COMPORTEMENTALES :
- Expliquer clairement pourquoi un passage est non-conforme (avec référence explicite aux règles RCST)
- Proposer des corrections concrètes, ciblées et immédiatement applicables
- Toujours justifier par un article ou une règle de la Constitution RCST
- Rester concis, pédagogique, professionnel et bienveillant
- Maintenir la cohérence avec le rapport d'audit déjà émis pour ce manuscrit

CONSTITUTION RCST — RÈGLES ESSENTIELLES :
1. Style impersonnel strict : bannir "nous", "je", "notre etude", "nos travaux"
2. Citations APA 7 : (Auteur, Annee) — interdire [1], [2]
3. ORCID (16 chiffres) obligatoire pour chaque auteur
4. Resume bilingue, max 250 mots, sans sous-titres ni references, 5 mots-cles
5. Sections IMRAD en chiffres arabes (1. Introduction...)
6. Tableaux : chiffres romains AVANT. Figures : chiffres arabes APRES.
7. 6 sections finales obligatoires (Remerciements, Financement, etc.)
"""


class ChatMessageIn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    manuscriptText: str = ""
    auditReport: Optional[dict] = None
    history: List[ChatMessageIn] = Field(default_factory=list)


@app.post("/api/chat")
async def chat_endpoint(payload: ChatRequest):
    """
    Assistant editorial contextuel RCST.
    Maintient l'historique de la conversation et le contexte manuscrit + audit.
    """
    context_system = _CHAT_SYSTEM_PROMPT
    if payload.manuscriptText:
        context_system += f"\n\nMANUSCRIT EN COURS D'AUDIT (extrait) :\n---\n{payload.manuscriptText[:4000]}\n---"
    if payload.auditReport:
        context_system += f"\n\nRAPPORT D'AUDIT (JSON) :\n{_json.dumps(payload.auditReport, ensure_ascii=False)[:2000]}"

    if not settings.GEMINI_API_KEY:
        msg_lower = payload.message.lower()
        fallback_map = [
            (["nous", "je ", "notre", "nos ", "impersonnel"],
             "Pour le style impersonnel RCST :\n• « nous avons analysé » → « une analyse a été conduite »\n• « nos résultats montrent » → « les résultats démontrent »\n• « notre étude prouve » → « les données attestent »\n\nConstitution RCST §5 : style impersonnel strict dans tout le manuscrit."),
            (["[1]", "[2]", "citation", "crochet", "apa"],
             "Format APA 7 requis (Constitution RCST §6) :\n• Dans le texte : (Mboma & Mabiala, 2020)\n• 3+ auteurs : (Mabiala et al., 2020)\n• Interdiction formelle des crochets [1], [2]."),
            (["orcid"],
             "ORCID obligatoire (Constitution RCST §2), format : 0000-0000-0000-000X\nObtenir gratuitement sur https://orcid.org/register"),
            (["résumé", "abstract", "250"],
             "Résumé RCST (§3) : bilingue FR+EN, max 250 mots, paragraphe unique sans sous-titres ni références, 5 mots-clés par langue."),
        ]
        for keywords, response in fallback_map:
            if any(k in msg_lower for k in keywords):
                return {"response": response, "isAiGenerated": False}
        return {"response": "Mode heuristique local actif (clé GEMINI_API_KEY absente). Configurez backend/.env pour des réponses contextuelles.", "isAiGenerated": False}

    try:
        from google import genai as _genai
        from google.genai import types as _types

        client = _genai.Client(api_key=settings.GEMINI_API_KEY)
        contents = []
        for msg in payload.history[-12:]:
            role = "model" if msg.role == "assistant" else "user"
            contents.append(_types.Content(role=role, parts=[_types.Part(text=msg.content)]))
        contents.append(_types.Content(role="user", parts=[_types.Part(text=payload.message)]))

        response = _generate_with_fallback(
            client=client,
            contents=contents,
            config=_types.GenerateContentConfig(system_instruction=context_system, temperature=0.3)
        )
        return {"response": response.text.strip(), "isAiGenerated": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur assistant editorial : {str(e)}")
