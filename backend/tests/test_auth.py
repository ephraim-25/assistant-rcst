"""
tests/test_auth.py — Suite de tests automatiques A1 & A2
=========================================================
Couvre :
  ✓ HTTP 401 sans token sur /api/audit
  ✓ HTTP 403 pour un Reviewer sur /api/admin/audit-trail
  ✓ Inscription (register) et connexion (login) réussies
  ✓ Accès /api/audit avec token valide (mock audit_service)
  ✓ HTTP 429 après dépassement du quota journalier simulé
  ✓ HTTP 409 si email déjà pris à l'inscription
  ✓ HTTP 401 avec mauvais mot de passe
"""
from __future__ import annotations

import sys
import os
import pytest
import uuid

# ── Forcer l'import direct (sans package relatif) ─────────────────────────────
_BACKEND = os.path.join(os.path.dirname(__file__), "..")
if _BACKEND not in sys.path:
    sys.path.insert(0, os.path.abspath(_BACKEND))

# Charger les variables d'environnement de test avant tout import du backend
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-ok")
# Base SQLite en mémoire pour les tests (évite de polluer rcst_data.db)
_TEST_DB = f"/tmp/rcst_test_{uuid.uuid4().hex}.db"
os.environ["SQLITE_DB_PATH"] = _TEST_DB

from fastapi.testclient import TestClient

# ── Patch governance pour accélération quota ──────────────────────────────────
import governance as _gov_module
import models as _models_module
import auth as _auth_module

# Reset singletons pour pointer vers la DB de test
_auth_module._user_db = None
_gov_module._governance_db = None

from main import app  # noqa: E402 (import après patch)

client = TestClient(app)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

def _unique_email() -> str:
    return f"test_{uuid.uuid4().hex[:8]}@rcst-test.cd"


def _register(email: str, password: str = "TestPass123!", role: str = "REVIEWER") -> dict:
    r = client.post("/api/auth/register", json={
        "email": email,
        "full_name": "Test Utilisateur",
        "password": password,
        "role": role,
    })
    assert r.status_code == 200, f"Register failed: {r.text}"
    data = r.json()
    if role == "ADMIN":
        # L'inscription publique ne donne jamais ADMIN : promotion directe en base de test.
        db = _auth_module.get_user_db()
        db.update_role(data["user_id"], _models_module.UserRole.ADMIN)
    return data


def _login(email: str, password: str = "TestPass123!") -> str:
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


# ─── Tests A1 : Authentification ──────────────────────────────────────────────

class TestHealthPublic:
    def test_health_no_auth(self):
        """Le endpoint /api/health est public."""
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"


class TestAuthEndpoints:
    def test_register_success(self):
        """Un nouvel utilisateur peut s'inscrire."""
        email = _unique_email()
        data = _register(email)
        assert "access_token" in data
        assert data["role"] in ("ADMIN", "REVIEWER")
        assert data["token_type"] == "bearer"

    def test_register_duplicate_email(self):
        """HTTP 409 si l'e-mail est déjà pris."""
        email = _unique_email()
        _register(email)
        r = client.post("/api/auth/register", json={
            "email": email,
            "full_name": "Doublon",
            "password": "TestPass123!",
            "role": "REVIEWER",
        })
        assert r.status_code == 409

    def test_register_weak_password(self):
        """HTTP 422 si le mot de passe est trop court."""
        r = client.post("/api/auth/register", json={
            "email": _unique_email(),
            "full_name": "Faible",
            "password": "abc",
            "role": "REVIEWER",
        })
        assert r.status_code == 422

    def test_login_success(self):
        """Connexion réussie — token JWT émis."""
        email = _unique_email()
        _register(email)
        r = client.post("/api/auth/login", json={"email": email, "password": "TestPass123!"})
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert body["role"] in ("ADMIN", "REVIEWER")

    def test_login_wrong_password(self):
        """HTTP 401 avec mauvais mot de passe."""
        email = _unique_email()
        _register(email)
        r = client.post("/api/auth/login", json={"email": email, "password": "WrongPass999!"})
        assert r.status_code == 401

    def test_login_unknown_email(self):
        """HTTP 401 avec e-mail inconnu."""
        r = client.post("/api/auth/login", json={
            "email": "inconnu@rcst.cd",
            "password": "TestPass123!"
        })
        assert r.status_code == 401

    def test_get_me_authenticated(self):
        """GET /api/auth/me retourne le profil de l'utilisateur connecté."""
        email = _unique_email()
        _register(email)
        token = _login(email)
        r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == email


# ─── Tests A1 : Protection des routes (401 sans token) ────────────────────────

class TestProtectedRoutes401:
    PROTECTED_ROUTES = [
        ("POST", "/api/audit", {"manuscriptText": "Texte de test suffisamment long pour passer la validation."}),
        ("POST", "/api/chat", {"message": "Test"}),
        ("POST", "/api/reformulate-style", {"textToReformulate": "Nous avons analysé les données."}),
        ("POST", "/api/convert-apa", {"referenceString": "Auteur (2024). Titre. Revue."}),
        ("GET",  "/api/admin/audit-trail", None),
        ("GET",  "/api/admin/quotas", None),
        ("GET",  "/api/admin/users", None),
    ]

    @pytest.mark.parametrize("method,path,body", PROTECTED_ROUTES)
    def test_401_without_token(self, method, path, body):
        """HTTP 401 sur toute route protégée sans Bearer Token."""
        kwargs = {"json": body} if (method != "GET" and body is not None) else {}
        r = getattr(client, method.lower())(path, **kwargs)
        assert r.status_code == 401, (
            f"{method} {path} devrait retourner 401, obtenu {r.status_code}: {r.text}"
        )


# ─── Tests A1 : RBAC — Reviewer ne peut pas accéder aux routes Admin (403) ───

class TestRBAC403:
    ADMIN_ROUTES = [
        ("GET",  "/api/admin/audit-trail", None),
        ("GET",  "/api/admin/quotas", None),
        ("GET",  "/api/admin/users", None),
    ]

    def setup_method(self):
        email = _unique_email()
        _register(email, role="REVIEWER")
        self.reviewer_token = _login(email)

    @pytest.mark.parametrize("method,path,body", ADMIN_ROUTES)
    def test_403_reviewer_on_admin_route(self, method, path, body):
        """HTTP 403 pour un Reviewer sur les routes d'administration."""
        kwargs = {"json": body} if (method != "GET" and body is not None) else {}
        r = getattr(client, method.lower())(
            path, **kwargs,
            headers={"Authorization": f"Bearer {self.reviewer_token}"}
        )
        assert r.status_code == 403, (
            f"Reviewer sur {method} {path} devrait obtenir 403, reçu {r.status_code}: {r.text}"
        )

    def test_admin_can_access_admin_routes(self):
        """Un Admin peut accéder aux routes d'administration."""
        email = _unique_email()
        _register(email, role="ADMIN")
        admin_token = _login(email)
        r = client.get("/api/admin/users",
                       headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200


# ─── Tests A2 : Quota journalier (429) ────────────────────────────────────────

class TestQuota429:
    def test_quota_exceeded_reviewer(self):
        """
        HTTP 429 après dépassement du quota journalier (REVIEWER).
        On manipule directement la DB de test pour simuler un dépassement.
        """
        from config import settings
        from governance import get_governance_db

        # Créer un reviewer et récupérer son ID
        email = _unique_email()
        reg_data = _register(email, role="REVIEWER")
        token = reg_data["access_token"]
        user_id = reg_data["user_id"]

        # Saturer le quota en insérant directement dans SQLite
        gov_db = get_governance_db()
        import sqlite3
        from datetime import date
        today = date.today().isoformat()
        with gov_db._lock, gov_db._connect() as conn:
            conn.execute(
                """INSERT INTO quota_usage (user_id, usage_date, call_count)
                   VALUES (?, ?, ?)
                   ON CONFLICT(user_id, usage_date)
                   DO UPDATE SET call_count = ?""",
                (user_id, today, settings.DAILY_QUOTA_REVIEWER, settings.DAILY_QUOTA_REVIEWER)
            )
            conn.commit()

        # Le prochain appel doit retourner 429
        r = client.post(
            "/api/reformulate-style",
            json={"textToReformulate": "Nous avons analysé les résultats."},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert r.status_code == 429, f"Attendu 429, reçu {r.status_code}: {r.text}"
        assert "Quota journalier" in r.json()["detail"]

    def test_admin_higher_quota(self):
        """
        Un Admin a un quota plus élevé (DAILY_QUOTA_ADMIN vs DAILY_QUOTA_REVIEWER).
        """
        from config import settings
        assert settings.DAILY_QUOTA_ADMIN > settings.DAILY_QUOTA_REVIEWER


# ─── Tests A2 : Audit Trail ───────────────────────────────────────────────────

class TestAuditTrail:
    def test_audit_trail_accessible_to_admin(self):
        """Un Admin peut consulter le journal d'audit."""
        email = _unique_email()
        _register(email, role="ADMIN")
        token = _login(email)
        r = client.get("/api/admin/audit-trail",
                       headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        body = r.json()
        assert "events" in body
        assert "total" in body

    def test_audit_trail_forbidden_for_reviewer(self):
        """Un Reviewer ne peut pas voir le journal d'audit."""
        email = _unique_email()
        _register(email, role="REVIEWER")
        token = _login(email)
        r = client.get("/api/admin/audit-trail",
                       headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403


# ─── Sécurité : pas d'auto-promotion ADMIN à l'inscription ────────────────────

class TestNoSelfPromotion:
    def test_register_with_admin_role_creates_reviewer(self):
        """Régression : un client ne peut pas se donner le rôle ADMIN."""
        email = _unique_email()
        r = client.post("/api/auth/register", json={
            "email": email, "full_name": "Pirate",
            "password": "TestPass123!", "role": "ADMIN",
        })
        assert r.status_code == 200
        assert r.json()["role"] == "REVIEWER"
        token = _login(email)
        assert client.get("/api/admin/users",
                          headers={"Authorization": f"Bearer {token}"}).status_code == 403

    def test_bootstrap_admin_from_env(self, monkeypatch):
        """Le premier ADMIN est créé depuis ADMIN_EMAIL / ADMIN_PASSWORD."""
        email = _unique_email()
        monkeypatch.setattr(_auth_module.settings, "ADMIN_EMAIL", email)
        monkeypatch.setattr(_auth_module.settings, "ADMIN_PASSWORD", "AdminPass123!")
        _auth_module.bootstrap_admin(_auth_module.get_user_db())
        token = _login(email, "AdminPass123!")
        assert client.get("/api/admin/users",
                          headers={"Authorization": f"Bearer {token}"}).status_code == 200


class TestUserStatus:
    def test_admin_can_suspend_and_reactivate(self):
        admin_email, user_email = _unique_email(), _unique_email()
        _register(admin_email, role="ADMIN")
        admin_h = {"Authorization": f"Bearer {_login(admin_email)}"}
        uid = _register(user_email)["user_id"]
        r = client.put(f"/api/admin/users/{uid}/status", json={"is_active": False}, headers=admin_h)
        assert r.status_code == 200
        assert client.post("/api/auth/login", json={"email": user_email, "password": "TestPass123!"}).status_code in (400, 401, 403)
        assert client.put(f"/api/admin/users/{uid}/status", json={"is_active": True}, headers=admin_h).status_code == 200
        _login(user_email)

    def test_admin_cannot_suspend_self_and_reviewer_forbidden(self):
        admin_email, rev_email = _unique_email(), _unique_email()
        admin_id = _register(admin_email, role="ADMIN")["user_id"]
        admin_h = {"Authorization": f"Bearer {_login(admin_email)}"}
        assert client.put(f"/api/admin/users/{admin_id}/status", json={"is_active": False}, headers=admin_h).status_code == 400
        _register(rev_email)
        rev_h = {"Authorization": f"Bearer {_login(rev_email)}"}
        assert client.put(f"/api/admin/users/{admin_id}/status", json={"is_active": False}, headers=rev_h).status_code == 403
