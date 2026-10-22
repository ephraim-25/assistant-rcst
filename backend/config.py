from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import secrets
import sys

# Résolution absolue du chemin vers backend/.env et .env racine
BASE_DIR = Path(__file__).resolve().parent


class ConfigError(RuntimeError):
    """Configuration serveur incomplète (variable d'environnement manquante)."""


class Settings(BaseSettings):
    # ── API IA ─────────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # ── Serveur ────────────────────────────────────────────────────────────────
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # CORS : origines séparées par des virgules — JAMAIS de wildcard en production
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ── Auth JWT ───────────────────────────────────────────────────────────────
    # En production, définir JWT_SECRET_KEY dans les variables d'environnement (min 32 chars).
    # En développement, une clé aléatoire est générée automatiquement (non persistée).
    JWT_SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60          # Durée de vie du token (1 heure)
    JWT_REFRESH_EXPIRE_DAYS: int = 7      # Optionnel — refresh token

    # ── Premier administrateur (amorçage) ─────────────────────────────────────
    # Créé au démarrage si les deux variables sont définies et si le compte n'existe pas.
    # Définir ces valeurs dans les variables d'environnement Vercel, jamais dans Git.
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""

    # ── Gouvernance & Quotas ───────────────────────────────────────────────────
    DAILY_QUOTA_REVIEWER: int = 20        # Appels IA max par jour pour un Reviewer
    DAILY_QUOTA_ADMIN: int = 200          # Appels IA max par jour pour un Admin
    # PostgreSQL (ex. Supabase, pooler « transaction » conseillé sur Vercel) :
    #   postgresql://USER:MOT_DE_PASSE@HOTE:6543/postgres
    # Si défini, remplace SQLite. OBLIGATOIRE en production (disque Vercel éphémère).
    DATABASE_URL: str = ""
    SQLITE_DB_PATH: str = str(BASE_DIR / "rcst_data.db")  # Chemin absolu SQLite

    # ─────────────────────────────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        """Retourne la liste des origines CORS valides et nettoyées."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def effective_jwt_secret(self) -> str:
        """
        Retourne la clé secrète JWT.
        En développement : génère une clé aléatoire si absente (non sécurisé pour prod).
        En production : lève SystemExit si la clé est absente ou trop courte.
        """
        key = self.JWT_SECRET_KEY
        if not key:
            if self.ENVIRONMENT.lower() == "production":
                raise ConfigError(
                    "JWT_SECRET_KEY est vide en production. "
                    "Définissez la variable d'environnement JWT_SECRET_KEY (min 32 chars)."
                )
            # Dev : clé aléatoire éphémère (les tokens expirent au redémarrage)
            return secrets.token_urlsafe(48)
        if len(key) < 32:
            print(
                f"[RCST] AVERTISSEMENT : JWT_SECRET_KEY trop courte ({len(key)} chars). "
                "Utilisez au minimum 32 caractères aléatoires.",
                file=sys.stderr
            )
        return key

    def validate_database(self) -> None:
        """Interdit le démarrage en production sans base persistante (PostgreSQL)."""
        if self.ENVIRONMENT.lower() == "production" and not self.DATABASE_URL.strip():
            print(
                "[RCST] ERREUR CRITIQUE : DATABASE_URL est vide en production. SQLite perd "
                "ses données sur Vercel ; définissez l'URL PostgreSQL (Supabase).",
                file=sys.stderr
            )
            sys.exit(1)

    def validate_cors(self) -> None:
        """Interdit le démarrage en production si CORS_ORIGINS est vide ou contient '*'."""
        if self.ENVIRONMENT.lower() == "production":
            origins = self.cors_origins_list
            if not origins:
                print(
                    "[RCST] ERREUR CRITIQUE : CORS_ORIGINS est vide en production.",
                    file=sys.stderr
                )
                sys.exit(1)
            if "*" in origins:
                print(
                    "[RCST] ERREUR CRITIQUE : CORS_ORIGINS contient '*' en mode production.",
                    file=sys.stderr
                )
                sys.exit(1)

    class Config:
        env_file = (BASE_DIR / ".env", BASE_DIR.parent / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
settings.validate_cors()
settings.validate_database()
