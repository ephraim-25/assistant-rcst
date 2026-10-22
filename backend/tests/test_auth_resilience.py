"""
Résilience de l'authentification : messages d'erreur lisibles, diagnostic /api/health,
administrateur de démarrage tolérant aux pannes, migration de la colonne is_active (PostgreSQL).
"""
from __future__ import annotations

import os
import sqlite3
import sys
import uuid

import pytest

_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-ok")
os.environ.setdefault("SQLITE_DB_PATH", f"/tmp/rcst_test_{uuid.uuid4().hex}.db")

from fastapi.testclient import TestClient  # noqa: E402

import auth as _auth  # noqa: E402
import main as _main  # noqa: E402
from config import ConfigError, settings  # noqa: E402
from database import is_postgres  # noqa: E402
from models import UserDB, UserInDB  # noqa: E402

client = TestClient(_main.app, raise_server_exceptions=False)


def _email() -> str:
    return f"res_{uuid.uuid4().hex[:8]}@rcst-test.cd"


def _payload(email: str) -> dict:
    return {"email": email, "full_name": "Test Résilience", "password": "TestPass123!"}


class TestHealthDiagnostic:
    def test_health_reports_database_and_config(self):
        body = client.get("/api/health").json()
        assert body["database"]["ok"] is True
        assert body["database"]["type"] in ("sqlite", "postgresql")
        assert "jwtConfigured" in body and "adminBootstrapConfigured" in body
        # Aucun secret dans la réponse
        assert settings.JWT_SECRET_KEY not in str(body)

    def test_health_degraded_when_database_fails(self, monkeypatch):
        def boom(self):
            raise sqlite3.OperationalError("base indisponible")
        monkeypatch.setattr(UserDB, "count", boom)
        body = client.get("/api/health").json()
        assert body["status"] == "degraded"
        assert body["database"] == {"type": body["database"]["type"], "ok": False, "error": "OperationalError"}


class TestReadableErrors:
    def test_database_failure_gives_503_with_french_message(self, monkeypatch):
        def boom(self, user):
            raise sqlite3.OperationalError("disque plein")
        monkeypatch.setattr(UserDB, "create_user", boom)
        r = client.post("/api/auth/register", json=_payload(_email()))
        assert r.status_code == 503
        assert "indisponible" in r.json()["detail"]
        assert "disque" not in r.json()["detail"]  # le détail technique n'est pas exposé

    def test_missing_jwt_secret_gives_503_not_process_exit(self, monkeypatch):
        def no_secret(*a, **k):
            raise ConfigError("JWT_SECRET_KEY est vide")
        monkeypatch.setattr(_main, "create_access_token", no_secret)
        r = client.post("/api/auth/register", json=_payload(_email()))
        assert r.status_code == 503
        assert "JWT_SECRET_KEY" not in r.text

    def test_unexpected_error_gives_generic_500(self, monkeypatch):
        def boom(self, email):
            raise ValueError("secret interne")
        monkeypatch.setattr(UserDB, "get_by_email", boom)
        r = client.post("/api/auth/login", json={"email": "a@b.cd", "password": "x"})
        assert r.status_code == 500
        assert "secret interne" not in r.text


class TestAdminBootstrapResilience:
    def test_bootstrap_failure_does_not_break_the_request_and_is_retried(self, monkeypatch):
        calls = {"n": 0}

        def flaky(db):
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("panne temporaire")

        monkeypatch.setattr(_auth, "bootstrap_admin", flaky)
        monkeypatch.setattr(_auth, "_admin_bootstrapped", False)
        _auth.get_user_db()                     # ne lève pas
        assert _auth._admin_bootstrapped is False
        _auth.get_user_db()                     # nouvel essai : réussit
        assert _auth._admin_bootstrapped is True
        assert calls["n"] == 2


@pytest.mark.skipif(not is_postgres(), reason="migration spécifique à PostgreSQL (définir DATABASE_URL)")
class TestPostgresLegacySchemaMigration:
    def test_integer_is_active_column_is_migrated_and_registration_works(self, monkeypatch):
        import psycopg

        schema = f"legacy_{uuid.uuid4().hex[:8]}"
        base_url = settings.DATABASE_URL
        with psycopg.connect(base_url, autocommit=True) as admin:
            admin.execute(f"CREATE SCHEMA {schema}")
            admin.execute(
                f"""CREATE TABLE {schema}.users (
                      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, full_name TEXT NOT NULL,
                      hashed_password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'REVIEWER',
                      is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)"""
            )
            admin.execute(
                f"INSERT INTO {schema}.users VALUES ('u1','ancien@rcst.cd','Ancien','h','REVIEWER',1,'2026-10-19')"
            )
        sep = "&" if "?" in base_url else "?"
        monkeypatch.setattr(settings, "DATABASE_URL", f"{base_url}{sep}options=-csearch_path%3D{schema}")
        try:
            db = UserDB("unused")
            assert db.get_by_email("ancien@rcst.cd").is_active is True   # donnée conservée
            db.create_user(UserInDB(email="nouveau@rcst.cd", full_name="Nouveau", hashed_password="h"))
            assert db.get_by_email("nouveau@rcst.cd").is_active is True
            assert db.set_active(db.get_by_email("nouveau@rcst.cd").id, False)
            UserDB("unused")                                             # idempotent
        finally:
            with psycopg.connect(base_url, autocommit=True) as admin:
                admin.execute(f"DROP SCHEMA {schema} CASCADE")
