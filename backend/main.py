import os
import io
import re
import unicodedata
import json as _json
import hashlib
from datetime import timedelta
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import sys
from pathlib import Path

# Assurer la compatibilité d'import sur Vercel Serverless (@vercel/python)
_CURRENT_DIR = Path(__file__).resolve().parent
if str(_CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(_CURRENT_DIR))
if str(_CURRENT_DIR.parent) not in sys.path:
    sys.path.insert(0, str(_CURRENT_DIR.parent))

try:
    from .config import settings
    from .extractor import extract_text_from_file
    from .audit_service import audit_manuscript_with_ai
    from .schemas import AuditRequest, AuditResponse, TextExtractionResponse
    from .models import UserDB, UserInDB, UserRole, UserPublic, TokenResponse, RegisterRequest, LoginRequest
    from .auth import (
        hash_password, verify_password, create_access_token,
        get_current_user, require_admin, get_user_db, oauth2_scheme
    )
    from .governance import GovernanceDB, get_governance_db, check_and_increment_quota
    from .docx_annotator import annotate_docx_from_report
    from .rules_engine import run_all_rules
    from .pdf_reporter import generate_author_pdf, generate_editor_pdf
    from .bib_checker import check_bibliography_concordance
    from .crossref_service import verify_reference_with_crossref, extract_doi_from_text
except (ImportError, ValueError):
    from config import settings
    from extractor import extract_text_from_file
    from audit_service import audit_manuscript_with_ai
    from schemas import AuditRequest, AuditResponse, TextExtractionResponse
    from models import UserDB, UserInDB, UserRole, UserPublic, TokenResponse, RegisterRequest, LoginRequest
    from auth import (
        hash_password, verify_password, create_access_token,
        get_current_user, require_admin, get_user_db, oauth2_scheme
    )
    from governance import GovernanceDB, get_governance_db, check_and_increment_quota
    from docx_annotator import annotate_docx_from_report
    from rules_engine import run_all_rules
    from pdf_reporter import generate_author_pdf, generate_editor_pdf
    from bib_checker import check_bibliography_concordance
    from crossref_service import verify_reference_with_crossref, extract_doi_from_text

app = FastAPI(
    title="RCST Editorial Compliance & Audit API",
    description="Plateforme officielle d'audit éditorial et de contrôle de conformité pour la Revue Congolaise des Sciences & Technologies (RCST) - Conseil Scientifique National RDC.",
    version="2.0.0"
)

# Configuration CORS sécurisée — pas de wildcard lorsque allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


# ─── Utilitaires internes ─────────────────────────────────────────────────────

def _ms_hash(text: str) -> str:
    """Retourne les 12 premiers chars du SHA-256 du texte (non PII)."""
    return hashlib.sha256(text.encode()).hexdigest()[:12]


def _ascii_filename(prefix: str, raw_title: str) -> str:
    """Génère un nom de fichier strictement ASCII pour les en-têtes HTTP Content-Disposition."""
    norm = unicodedata.normalize('NFKD', raw_title or "manuscrit")
    clean = norm.encode('ASCII', 'ignore').decode('ASCII')
    slug = re.sub(r'[^a-zA-Z0-9_\-]+', '_', clean).strip('_')[:40]
    return f"{prefix}_{slug or 'manuscrit'}.pdf"


def _generate_with_fallback(client, contents, config):
    candidate_models = list(dict.fromkeys([
        settings.GEMINI_MODEL,
        "gemini-3-flash-preview",
        "gemini-3.5-flash"
    ]))
    last_err = None
    for m in candidate_models:
        try:
            return client.models.generate_content(model=m, contents=contents, config=config)
        except Exception as e:
            last_err = e
            continue
    raise last_err or RuntimeError("Aucun modèle Gemini disponible.")


# ─── Health (public) ──────────────────────────────────────────────────────────

@app.get("/api/health", tags=["Système"])
async def health_check():
    """Vérification de l'état du serveur backend."""
    return {
        "status": "healthy",
        "service": "RCST Editorial Audit Engine",
        "hasGeminiKey": bool(settings.GEMINI_API_KEY),
        "environment": settings.ENVIRONMENT,
        "version": "2.0.0"
    }


# ═════════════════════════════════════════════════════════════════════════════
# AUTH — Endpoints publics
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/register", response_model=TokenResponse, tags=["Auth"])
async def register(
    payload: RegisterRequest,
    db: UserDB = Depends(get_user_db),
):
    """
    Crée un nouveau compte utilisateur.
    Le mot de passe est haché avec bcrypt avant stockage.
    """
    email = payload.email.lower().strip()
    if db.get_by_email(email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cette adresse e-mail existe déjà."
        )
    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le mot de passe doit comporter au moins 8 caractères."
        )

    user = UserInDB(
        email=email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        # SÉCURITÉ : le rôle n'est JAMAIS choisi par le client. Toute inscription
        # publique crée un REVIEWER ; la promotion se fait via /api/admin/users/{id}/role.
        role=UserRole.REVIEWER,
    )
    db.create_user(user)

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
        user_id=user.id,
    )


@app.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(
    payload: LoginRequest,
    db: UserDB = Depends(get_user_db),
):
    """
    Authentifie un utilisateur et délivre un Bearer Token JWT.
    """
    email = payload.email.lower().strip()
    user = db.get_by_email(email)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été désactivé.",
        )

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
    )
    return TokenResponse(
        access_token=token,
        role=user.role,
        full_name=user.full_name,
        user_id=user.id,
    )


@app.get("/api/auth/me", response_model=UserPublic, tags=["Auth"])
async def get_me(current_user: UserInDB = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return UserPublic(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


# ═════════════════════════════════════════════════════════════════════════════
# EXTRACTION (protégé — token requis)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/extract-file", response_model=TextExtractionResponse, tags=["Éditorial"])
async def extract_file_endpoint(
    file: UploadFile = File(...),
    current_user: UserInDB = Depends(get_current_user),
):
    """Extrait le texte brut d'un manuscrit (.docx, .pdf, .txt, .md)."""
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun fichier soumis.")

    filename = file.filename or "manuscrit"
    try:
        content_bytes = await file.read()
        extracted_text, ext = extract_text_from_file(content_bytes, filename)
        words = len(extracted_text.split())
        return TextExtractionResponse(
            text=extracted_text, filename=filename, extension=ext,
            sizeBytes=len(content_bytes), wordCount=words,
            message=f"Document '{filename}' extrait avec succès ({words} mots). Prêt pour l'audit RCST."
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Erreur lors de l'extraction : {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# AUDIT (protégé + quota + journal)
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/audit", tags=["Éditorial"])
async def audit_endpoint(
    payload: AuditRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    Route principale d'audit de conformité RCST.
    Exige un Bearer Token JWT valide (HTTP 401 sinon).
    Respecte le quota journalier (HTTP 429 si dépassé).
    """
    text = payload.manuscriptText.strip()
    if len(text) < 50:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Le manuscrit est trop court pour un audit éditorial.")

    # Vérification quota
    check_and_increment_quota(current_user.id, current_user.role, gov_db)

    action_status = 200
    error_detail = ""
    try:
        audit_result = await audit_manuscript_with_ai(
            manuscript_text=text,
            source_filename=payload.sourceFilename or "manuscrit"
        )
        return audit_result
    except HTTPException as e:
        action_status = e.status_code
        error_detail = str(e.detail)
        raise
    except Exception as e:
        action_status = 500
        error_detail = str(e)
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'audit : {str(e)}")
    finally:
        gov_db.log_event(
            user_id=current_user.id,
            user_email=current_user.email,
            action="audit",
            model_used=settings.GEMINI_MODEL,
            tokens_estimated=len(text) // 4,
            manuscript_hash=_ms_hash(text),
            status_code=action_status,
            error_detail=error_detail,
        )


# ═════════════════════════════════════════════════════════════════════════════
# REFORMULATION (protégé + quota + journal)
# ═════════════════════════════════════════════════════════════════════════════

class ReformulateRequest(BaseModel):
    textToReformulate: str


@app.post("/api/reformulate-style", tags=["Éditorial"])
async def reformulate_style_endpoint(
    payload: ReformulateRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """Reformule un passage en style impersonnel strict RCST."""
    text = payload.textToReformulate.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texte à reformuler manquant.")

    check_and_increment_quota(current_user.id, current_user.role, gov_db)

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
        gov_db.log_event(current_user.id, current_user.email, "reformulate",
                         status_code=200)
        return {"rephrased": result, "explanations": ["Reformulation heuristique locale."]}

    try:
        from google import genai
        from google.genai import types
        import json

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"""Réécris le passage suivant dans le style impersonnel strict exigé par la Constitution RCST.
Bannis catégoriquement « nous », « je », « notre », « nos », « nos travaux ». Utilise des tournures passives, impersonnelles ou nominales.

Passage : \"{text}\"

Réponds au format JSON :
{{
  "rephrased": "texte réécrit",
  "explanations": ["liste d'explications sur les changements apportés"]
}}"""
        response = _generate_with_fallback(
            client=client, contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1, response_mime_type="application/json")
        )
        result = json.loads(response.text.strip())
        gov_db.log_event(current_user.id, current_user.email, "reformulate",
                         model_used=settings.GEMINI_MODEL, tokens_estimated=len(text) // 4, status_code=200)
        return result
    except Exception as e:
        gov_db.log_event(current_user.id, current_user.email, "reformulate",
                         status_code=500, error_detail=str(e))
        raise HTTPException(status_code=500, detail=f"Erreur reformulation : {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# CONVERSION APA (protégé + quota + journal)
# ═════════════════════════════════════════════════════════════════════════════

class ApaConvertRequest(BaseModel):
    referenceString: str


@app.post("/api/convert-apa", tags=["Éditorial"])
async def convert_apa_endpoint(
    payload: ApaConvertRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """Convertit une référence bibliographique au format APA 7e édition RCST."""
    ref = payload.referenceString.strip()
    if not ref:
        raise HTTPException(status_code=400, detail="Référence bibliographique manquante.")

    check_and_increment_quota(current_user.id, current_user.role, gov_db)

    if not settings.GEMINI_API_KEY:
        gov_db.log_event(current_user.id, current_user.email, "convert_apa", status_code=200)
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
        prompt = f"""Convertis cette référence bibliographique selon les normes APA 7ème édition RCST.
Règles : ordre auteurs (Nom, Initiale.), année entre parenthèses, titre de revue en italique, DOI actif si disponible.

Référence source : \"{ref}\"

Réponds en JSON :
{{
  "apaFormatted": "référence formatée APA 7",
  "inTextCitationParenthetical": "ex: (Mboma & Mabiala, 2015)",
  "inTextCitationNarrative": "ex: Mboma et Mabiala (2015)",
  "notes": "corrections apportées"
}}"""
        response = _generate_with_fallback(
            client=client, contents=prompt,
            config=types.GenerateContentConfig(temperature=0.1, response_mime_type="application/json")
        )
        result = json.loads(response.text.strip())
        gov_db.log_event(current_user.id, current_user.email, "convert_apa",
                         model_used=settings.GEMINI_MODEL, tokens_estimated=len(ref) // 4, status_code=200)
        return result
    except Exception as e:
        gov_db.log_event(current_user.id, current_user.email, "convert_apa",
                         status_code=500, error_detail=str(e))
        raise HTTPException(status_code=500, detail=f"Erreur conversion APA : {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# CHAT (protégé + quota + journal)
# ═════════════════════════════════════════════════════════════════════════════

_CHAT_SYSTEM_PROMPT = """Tu es l'assistant éditorial expert et assermenté de la Revue Congolaise des Sciences & Technologies (RCST), sous l'égide du Conseil Scientifique National (RDC).

DIRECTIVES :
- Expliquer clairement pourquoi un passage est non-conforme (avec référence aux règles RCST)
- Proposer des corrections concrètes et immédiatement applicables
- Toujours justifier par un article ou une règle de la Constitution RCST
- Rester concis, pédagogique, professionnel et bienveillant

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


@app.post("/api/chat", tags=["Éditorial"])
async def chat_endpoint(
    payload: ChatRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """Assistant éditorial contextuel RCST (JWT requis)."""
    check_and_increment_quota(current_user.id, current_user.role, gov_db)

    context_system = _CHAT_SYSTEM_PROMPT
    if payload.manuscriptText:
        context_system += f"\n\nMANUSCRIT EN COURS D'AUDIT :\n---\n{payload.manuscriptText[:4000]}\n---"
    if payload.auditReport:
        context_system += f"\n\nRAPPORT D'AUDIT :\n{_json.dumps(payload.auditReport, ensure_ascii=False)[:2000]}"

    if not settings.GEMINI_API_KEY:
        gov_db.log_event(current_user.id, current_user.email, "chat", status_code=200)
        return {"response": "Mode heuristique local actif (clé GEMINI_API_KEY absente).", "isAiGenerated": False}

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
            client=client, contents=contents,
            config=_types.GenerateContentConfig(system_instruction=context_system, temperature=0.3)
        )
        gov_db.log_event(
            current_user.id, current_user.email, "chat",
            model_used=settings.GEMINI_MODEL,
            tokens_estimated=len(payload.message) // 4,
            status_code=200
        )
        return {"response": response.text.strip(), "isAiGenerated": True}
    except Exception as e:
        gov_db.log_event(current_user.id, current_user.email, "chat",
                         status_code=500, error_detail=str(e))
        raise HTTPException(status_code=500, detail=f"Erreur assistant editorial : {str(e)}")


# ═════════════════════════════════════════════════════════════════════════════
# ADMIN — Routes réservées aux administrateurs (require_admin → HTTP 403)
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/audit-trail", tags=["Administration"])
async def get_audit_trail(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    _admin: UserInDB = Depends(require_admin),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """Consultation du journal d'audit (ADMIN uniquement)."""
    events = gov_db.get_trail(limit=limit, offset=offset, user_id=user_id, action=action)
    total = gov_db.count_trail()
    return {"total": total, "limit": limit, "offset": offset, "events": events}


@app.get("/api/admin/quotas", tags=["Administration"])
async def get_quotas(
    _admin: UserInDB = Depends(require_admin),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """Tableau de bord des quotas journaliers (ADMIN uniquement)."""
    return {
        "date": __import__("datetime").date.today().isoformat(),
        "quotas": gov_db.all_quotas_today(),
        "limits": {
            "ADMIN": settings.DAILY_QUOTA_ADMIN,
            "REVIEWER": settings.DAILY_QUOTA_REVIEWER,
        }
    }


@app.get("/api/admin/users", tags=["Administration"])
async def list_users(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    _admin: UserInDB = Depends(require_admin),
    db: UserDB = Depends(get_user_db),
):
    """Liste des utilisateurs enregistrés (ADMIN uniquement)."""
    users = db.list_users(limit=limit, offset=offset)
    total = db.count()
    return {"total": total, "limit": limit, "offset": offset, "users": users}


@app.put("/api/admin/users/{user_id}/role", tags=["Administration"])
async def update_user_role(
    user_id: str,
    payload: dict,
    _admin: UserInDB = Depends(require_admin),
    db: UserDB = Depends(get_user_db),
):
    """Met à jour le rôle d'un utilisateur (ADMIN uniquement)."""
    new_role = payload.get("role")
    if new_role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=422, detail="Rôle invalide. Valeurs acceptées : ADMIN, REVIEWER.")
    success = db.update_role(user_id, UserRole(new_role))
    if not success:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return {"message": f"Rôle mis à jour → {new_role}", "user_id": user_id}


@app.put("/api/admin/users/{user_id}/status", tags=["Administration"])
async def set_user_status(
    user_id: str,
    payload: dict,
    admin: UserInDB = Depends(require_admin),
    db: UserDB = Depends(get_user_db),
):
    """Suspend ou réactive un compte (ADMIN uniquement). Un admin ne peut pas se suspendre lui-même."""
    is_active = payload.get("is_active")
    if not isinstance(is_active, bool):
        raise HTTPException(status_code=422, detail="Champ 'is_active' (booléen) requis.")
    if user_id == admin.id and not is_active:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas suspendre votre propre compte.")
    if not db.set_active(user_id, is_active):
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return {"message": "Compte réactivé." if is_active else "Compte suspendu.", "user_id": user_id}


@app.delete("/api/admin/users/{user_id}", tags=["Administration"])
async def deactivate_user(
    user_id: str,
    _admin: UserInDB = Depends(require_admin),
    db: UserDB = Depends(get_user_db),
):
    """Désactive un compte utilisateur (ADMIN uniquement)."""
    success = db.deactivate(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return {"message": "Compte désactivé.", "user_id": user_id}


@app.post("/api/admin/quotas/reset/{user_id}", tags=["Administration"])
async def reset_user_quota(
    user_id: str,
    _admin: UserInDB = Depends(require_admin),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """Réinitialise le quota journalier d'un utilisateur (ADMIN uniquement)."""
    gov_db.reset_quota(user_id)
    return {"message": f"Quota réinitialisé pour l'utilisateur {user_id}"}


# ═════════════════════════════════════════════════════════════════════════════
# ANNOTATION DOCX (B1) — Génération du manuscrit .docx annoté avec commentaires Word natifs
# ═════════════════════════════════════════════════════════════════════════════

@app.post(
    "/api/annotate-docx",
    tags=["Éditorial"],
    summary="Génère un .docx annoté avec des commentaires Word natifs RCST",
    response_description="Fichier .docx annoté, prêt pour téléchargement",
)
async def annotate_docx_endpoint(
    file: UploadFile = File(..., description="Fichier .docx source soumis par l'auteur"),
    audit_report: str = Form(
        default="{}",
        description="Rapport d'audit JSON (chaîne, optionnel). Si absent, le moteur de règles est exécuté en interne.",
    ),
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    **Endpoint B1 — Annotation Word natif RCST**

    Accepte le `.docx` original + le rapport d'audit JSON, insère des
    commentaires Word natifs (OOXML) sur chaque passage fautif,
    et retourne le fichier annoté en téléchargement.

    - **JWT Bearer Token requis** (HTTP 401 sinon)
    - **Quota journalier** respecté (HTTP 429 si dépassé)
    - **Le texte original n'est jamais modifié**
    - Compatible Word 2007+, LibreOffice, Google Docs

    Format du rapport d'audit attendu (optionnel) :
    ```json
    {
      "rulesReport": {
        "violations": [
          {"rule_id": "RCST-S01", "severity": "CRITICAL",
           "title": "...", "message": "...", "excerpt": "..."}
        ]
      }
    }
    ```
    Si `audit_report` est absent ou `{}`, le moteur de règles est
    exécuté automatiquement sur le texte extrait du .docx.
    """
    # ── Validation du fichier ──────────────────────────────────────────────
    if not file or not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Aucun fichier soumis.")

    filename = file.filename
    ext = Path(filename).suffix.lower()
    if ext != ".docx":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Seul le format .docx est accepté pour l'annotation (reçu : {ext or 'inconnu'})."
        )

    # ── Lecture des bytes ─────────────────────────────────────────────────
    try:
        docx_bytes = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de lecture du fichier : {e}")

    if len(docx_bytes) < 100:
        raise HTTPException(status_code=400, detail="Le fichier .docx semble vide ou corrompu.")

    # ── Vérification quota ────────────────────────────────────────────────
    check_and_increment_quota(current_user.id, current_user.role, gov_db)

    action_status = 200
    error_detail = ""
    try:
        # ── Parsing du rapport d'audit ────────────────────────────────────
        try:
            report_dict = _json.loads(audit_report) if audit_report.strip() != "{}" else {}
        except _json.JSONDecodeError:
            report_dict = {}

        # ── Si aucun rapport fourni → exécuter le moteur de règles ────────
        if not report_dict or not report_dict.get("rulesReport", {}).get("violations"):
            from extractor import extract_text_from_file
            text, _ = extract_text_from_file(docx_bytes, filename)
            rules_report = run_all_rules(text)
            report_dict = {"rulesReport": rules_report.to_dict()}

        # ── Annotation ────────────────────────────────────────────────────
        annotated_bytes = annotate_docx_from_report(docx_bytes, report_dict)

        # ── Réponse en streaming ──────────────────────────────────────────
        safe_name = Path(filename).stem + "_RCST_annote.docx"
        return StreamingResponse(
            content=iter([annotated_bytes]),
            media_type=(
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            ),
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}"',
                "Content-Length": str(len(annotated_bytes)),
                "X-RCST-Violations": str(
                    len(report_dict.get("rulesReport", {}).get("violations", []))
                ),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        action_status = 500
        error_detail = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'annotation du document : {e}"
        )
    finally:
        gov_db.log_event(
            user_id=current_user.id,
            user_email=current_user.email,
            action="annotate_docx",
            model_used="rules_engine_only",
            tokens_estimated=0,
            manuscript_hash=_ms_hash(filename),
            status_code=action_status,
            error_detail=error_detail,
        )


# ═════════════════════════════════════════════════════════════════════════════
# RAPPORTS PDF (B2 & B3) — Génération des rapports institutionnels RCST
# ═════════════════════════════════════════════════════════════════════════════

class PdfReportRequest(BaseModel):
    manuscriptTitle: str = Field(default="Manuscrit Soumis", description="Titre complet du manuscrit")
    authorName: Optional[str] = Field(default="Auteur(s)", description="Nom(s) de(s) auteur(s)")
    sourceFilename: Optional[str] = Field(default="manuscrit.docx", description="Nom du fichier source")
    manuscriptText: Optional[str] = Field(default=None, description="Texte brut du manuscrit (si disponible)")
    auditReport: Optional[dict] = Field(default=None, description="Rapport d'audit structuré retourné par /api/audit")


@app.post(
    "/api/reports/author-pdf",
    tags=["Éditorial"],
    summary="Génère le Rapport PDF Auteur RCST (B2)",
    response_description="Flux binaire PDF du rapport auteur téléchargeable",
)
async def author_pdf_endpoint(
    payload: PdfReportRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    **Endpoint B2 — Rapport d'Audit Auteur (PDF)**

    Génère un document PDF institutionnel, constructif et pédagogique
    destiné à être remis directement au chercheur/auteur.
    - Met en évidence les non-conformités détectées avec leurs extraits et modèles de correction.
    - Exclut strictement toute note confidentielle ou délibération interne du comité.
    - Protégé par JWT (`get_current_user`).
    """
    check_and_increment_quota(current_user.id, current_user.role, gov_db)

    action_status = 200
    error_detail = ""
    try:
        pdf_bytes = generate_author_pdf(
            manuscript_title=payload.manuscriptTitle,
            author_name=payload.authorName or current_user.full_name,
            source_filename=payload.sourceFilename or "manuscrit.docx",
            audit_report=payload.auditReport,
            manuscript_text=payload.manuscriptText,
        )

        filename = _ascii_filename("Rapport_Auteur_RCST", payload.manuscriptTitle)

        return StreamingResponse(
            content=io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except Exception as e:
        action_status = 500
        error_detail = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération du PDF auteur : {e}"
        )
    finally:
        gov_db.log_event(
            user_id=current_user.id,
            user_email=current_user.email,
            action="generate_author_pdf",
            model_used="reportlab_engine",
            tokens_estimated=0,
            manuscript_hash=_ms_hash(payload.manuscriptTitle),
            status_code=action_status,
            error_detail=error_detail,
        )


@app.post(
    "/api/reports/editor-pdf",
    tags=["Éditorial"],
    summary="Génère le Rapport PDF Éditeur RCST (B3)",
    response_description="Flux binaire PDF du rapport éditeur téléchargeable",
)
async def editor_pdf_endpoint(
    payload: PdfReportRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    **Endpoint B3 — Rapport d'Instruction Éditeur (PDF)**

    Génère le dossier d'évaluation PDF confidentiel destiné au comité de lecture
    et à l'éditeur principal (rôles `REVIEWER` ou `ADMIN`).
    - Présente l'analyse en 3 blocs stricts :
        🔴 À corriger (Bloquant - Sévérité CRITICAL)
        🟡 À vérifier (Avertissement - Sévérité WARNING)
        🟢 Conforme (Validé - Règles respectées)
    - Affiche le score global (/100), la recommandation formelle et la synthèse.
    - Protégé par JWT et vérification de rôle (REVIEWER ou ADMIN requis).
    """
    # Seuls REVIEWER et ADMIN sont habilités à accéder au rapport d'instruction interne
    if current_user.role not in (UserRole.ADMIN, UserRole.REVIEWER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux membres du comité éditorial (Reviewers et Administrateurs)."
        )

    check_and_increment_quota(current_user.id, current_user.role, gov_db)

    action_status = 200
    error_detail = ""
    try:
        pdf_bytes = generate_editor_pdf(
            manuscript_title=payload.manuscriptTitle,
            author_name=payload.authorName or "Auteur(s)",
            source_filename=payload.sourceFilename or "manuscrit.docx",
            reviewer_name=f"{current_user.full_name} ({current_user.role.value})",
            audit_report=payload.auditReport,
            manuscript_text=payload.manuscriptText,
        )

        filename = _ascii_filename("Dossier_Editeur_RCST", payload.manuscriptTitle)

        return StreamingResponse(
            content=io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes)),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        action_status = 500
        error_detail = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la génération du PDF éditeur : {e}"
        )
    finally:
        gov_db.log_event(
            user_id=current_user.id,
            user_email=current_user.email,
            action="generate_editor_pdf",
            model_used="reportlab_engine",
            tokens_estimated=0,
            manuscript_hash=_ms_hash(payload.manuscriptTitle),
            status_code=action_status,
            error_detail=error_detail,
        )


# ═════════════════════════════════════════════════════════════════════════════
# VALIDATION ÉDITEUR AVANT ENVOI (B4)
# ═════════════════════════════════════════════════════════════════════════════

class ApproveDispatchRequest(BaseModel):
    comments: Optional[str] = Field(default="", description="Commentaire d'approbation ou instructions à l'auteur")


@app.post(
    "/api/submissions/{submission_id}/approve-dispatch",
    tags=["Éditorial"],
    summary="Validation formelle de l'éditeur avant envoi du rapport/manuscrit à l'auteur (B4)",
)
async def approve_dispatch_endpoint(
    submission_id: str,
    payload: Optional[ApproveDispatchRequest] = None,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    **Endpoint B4 — Approbation humaine formelle avant expédition**
    
    Exige le rôle REVIEWER ou ADMIN.
    Enregistre l'identité de l'éditeur, l'horodatage et la décision dans submission_dispatches
    et dans l'Audit Trail pour traçabilité médico-légale et institutionnelle.
    """
    if current_user.role not in (UserRole.ADMIN, UserRole.REVIEWER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les membres du comité éditorial (Reviewers et Administrateurs) peuvent valider l'envoi."
        )

    comments = payload.comments if payload else ""
    res = gov_db.approve_dispatch(
        submission_id=submission_id,
        approved_by_id=current_user.id,
        approved_by_email=current_user.email,
        approved_by_name=current_user.full_name,
        editor_role=current_user.role.value,
        comments=comments or "",
    )
    return {
        "message": f"Soumission {submission_id} formellement approuvée pour expédition à l'auteur.",
        "dispatch": res,
    }


@app.get(
    "/api/submissions/{submission_id}/dispatch-status",
    tags=["Éditorial"],
    summary="Consulte le statut d'approbation d'une soumission (B4)",
)
async def get_dispatch_status_endpoint(
    submission_id: str,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    dispatch = gov_db.get_dispatch(submission_id)
    return {
        "submission_id": submission_id,
        "isApproved": bool(dispatch and dispatch.get("dispatch_status") == "APPROVED"),
        "details": dispatch,
    }


# ═════════════════════════════════════════════════════════════════════════════
# CONCORDANCE BIBLIOGRAPHIQUE & CROSSREF (B5 & B6)
# ═════════════════════════════════════════════════════════════════════════════

class ConcordanceRequest(BaseModel):
    manuscriptText: str = Field(..., description="Texte intégral du manuscrit")


@app.post(
    "/api/citations/check-concordance",
    tags=["Éditorial"],
    summary="Vérifie la concordance entre citations in-text et bibliographie APA 7 (B5)",
)
async def check_concordance_endpoint(
    payload: ConcordanceRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    **Endpoint B5 — Concordance Bibliographique**
    
    Détecte :
      - Citations orphelines (in-text sans entrée bibliographique correspondante)
      - Références non citées (entrées biblio jamais appelées dans le texte)
      - Respect de l'ordre alphabétique APA 7
    """
    check_and_increment_quota(current_user.id, current_user.role, gov_db)
    report = check_bibliography_concordance(payload.manuscriptText)
    return report.to_dict()


class CrossrefVerifyRequest(BaseModel):
    reference: str = Field(..., description="Texte de la référence bibliographique ou DOI")


@app.post(
    "/api/citations/verify-crossref",
    tags=["Éditorial"],
    summary="Interroge l'API mondiale CrossRef pour valider une référence ou un DOI (B6)",
)
async def verify_crossref_endpoint(
    payload: CrossrefVerifyRequest,
    current_user: UserInDB = Depends(get_current_user),
    gov_db: GovernanceDB = Depends(get_governance_db),
):
    """
    **Endpoint B6 — Validation CrossRef**
    
    Vérifie l'existence dans le registre mondial CrossRef, extrait les métadonnées officielles
    et signale les éventuelles divergences d'année ou de titre.
    """
    check_and_increment_quota(current_user.id, current_user.role, gov_db)
    res = await verify_reference_with_crossref(payload.reference)
    return res.to_dict()



