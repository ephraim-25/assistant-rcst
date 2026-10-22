"""
auth.py — Authentification JWT & RBAC pour l'API RCST
------------------------------------------------------
• Hachage bcrypt direct (via bibliothèque bcrypt)
• Jetons JWT HS256 via python-jose
• Dépendances FastAPI : get_current_user, require_admin
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt as _bcrypt_lib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

try:
    from .config import settings
    from .models import UserDB, UserInDB, UserRole
except ImportError:
    from config import settings
    from models import UserDB, UserInDB, UserRole

# ─── Hachage bcrypt (direct, compatible bcrypt 3.x et 4.x) ───────────────────

def hash_password(plain: str) -> str:
    """Hache un mot de passe en clair avec bcrypt (rounds=12)."""
    return _bcrypt_lib.hashpw(plain.encode("utf-8"), _bcrypt_lib.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Vérifie un mot de passe en clair contre le hash bcrypt."""
    try:
        return _bcrypt_lib.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ─── JWT ─────────────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Crée un token JWT signé HS256.
    Champs minimaux : sub (user_id), role, email.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(
        to_encode,
        settings.effective_jwt_secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    """
    Décode et vérifie un token JWT.
    Lève HTTP 401 si le token est invalide ou expiré.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré. Veuillez vous reconnecter.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.effective_jwt_secret,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


# ─── Dépendances FastAPI ──────────────────────────────────────────────────────

# Schéma OAuth2 Bearer — pointe vers l'endpoint de login
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# Instance partagée de la base utilisateurs
_user_db: Optional[UserDB] = None
_admin_bootstrapped = False


def get_user_db() -> UserDB:
    """Injection de dépendance — retourne l'instance partagée UserDB."""
    global _user_db, _admin_bootstrapped
    if _user_db is None:
        _user_db = UserDB(settings.SQLITE_DB_PATH)
    if not _admin_bootstrapped:
        # Un échec ici ne doit jamais faire échouer la requête de l'utilisateur ; on réessaie à l'appel suivant.
        try:
            bootstrap_admin(_user_db)
            _admin_bootstrapped = True
        except Exception as exc:  # noqa: BLE001
            print(f"[RCST] Création de l'administrateur de démarrage impossible : "
                  f"{type(exc).__name__}: {exc}", file=sys.stderr)
    return _user_db


def bootstrap_admin(db: UserDB) -> None:
    """Crée le premier ADMIN depuis ADMIN_EMAIL / ADMIN_PASSWORD (si définis et absent)."""
    email = (settings.ADMIN_EMAIL or "").lower().strip()
    password = settings.ADMIN_PASSWORD or ""
    if not email or not password or db.get_by_email(email):
        return
    if len(password) < 8:
        print("[RCST] ADMIN_PASSWORD trop court (min 8) : administrateur non créé.", file=sys.stderr)
        return
    db.create_user(UserInDB(
        email=email, full_name="Administrateur RCST",
        hashed_password=hash_password(password), role=UserRole.ADMIN,
    ))


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: UserDB = Depends(get_user_db),
) -> UserInDB:
    """
    Dépendance FastAPI — exige un Bearer Token JWT valide.
    Retourne l'utilisateur correspondant ou lève HTTP 401.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise. Fournissez un Bearer Token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    user_id: str = payload.get("sub", "")
    user = db.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou supprimé.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été désactivé. Contactez l'administrateur.",
        )
    return user


async def require_admin(
    token: Optional[str] = Depends(oauth2_scheme),
    db: UserDB = Depends(get_user_db),
) -> UserInDB:
    """
    Dépendance FastAPI — exige d'abord un token valide (HTTP 401),
    puis vérifie que le rôle est ADMIN (HTTP 403 sinon).
    """
    # Vérification token (401 si absent)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise. Fournissez un Bearer Token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Décodage et récupération utilisateur
    payload = decode_token(token)
    user_id: str = payload.get("sub", "")
    current_user = db.get_by_id(user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou supprimé.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ce compte a été désactivé.",
        )
    # Vérification du rôle (403 si REVIEWER)
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs (Éditeur Principal).",
        )
    return current_user
