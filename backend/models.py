"""
models.py — Modèles de données utilisateurs RCST
Persistance SQLite / PostgreSQL thread-safe via database.connect + threading.Lock.
"""
from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

try:
    from .database import connect as connect_db
except ImportError:
    from database import connect as connect_db


# ─── Enums & Modèles Pydantic ─────────────────────────────────────────────────

class UserRole(str, Enum):
    ADMIN    = "ADMIN"
    REVIEWER = "REVIEWER"


class UserInDB(BaseModel):
    """Représentation complète d'un utilisateur (avec mot de passe haché)."""
    id:              str       = Field(default_factory=lambda: str(uuid.uuid4()))
    email:           str
    full_name:       str
    hashed_password: str
    role:            UserRole  = UserRole.REVIEWER
    is_active:       bool      = True
    created_at:      str       = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class UserPublic(BaseModel):
    """Vue publique d'un utilisateur (sans mot de passe)."""
    id:         str
    email:      str
    full_name:  str
    role:       UserRole
    is_active:  bool
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         UserRole
    full_name:    str
    user_id:      str


class RegisterRequest(BaseModel):
    email:     str
    full_name: str
    password:  str
    role:      UserRole = UserRole.REVIEWER


class LoginRequest(BaseModel):
    email:    str
    password: str


# ─── Couche de persistance Base de données ───────────────────────────────────

class UserDB:
    """
    Gestionnaire thread-safe de la table 'users'.
    Compatible SQLite (développement) et PostgreSQL / Supabase (production).
    """
    _lock = threading.Lock()

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._init_db()

    def _connect(self):
        return connect_db(self._db_path)

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id              TEXT PRIMARY KEY,
                    email           TEXT UNIQUE NOT NULL,
                    full_name       TEXT NOT NULL,
                    hashed_password TEXT NOT NULL,
                    role            TEXT NOT NULL DEFAULT 'REVIEWER',
                    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at      TEXT NOT NULL
                )
            """)
            conn.commit()

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def create_user(self, user: UserInDB) -> UserInDB:
        with self._lock, self._connect() as conn:
            conn.execute(
                """INSERT INTO users
                   (id, email, full_name, hashed_password, role, is_active, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (user.id, user.email, user.full_name, user.hashed_password,
                 user.role.value, user.is_active, user.created_at)
            )
            conn.commit()
        return user

    def get_by_email(self, email: str) -> Optional[UserInDB]:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ?", (email.lower().strip(),)
            ).fetchone()
        if not row:
            return None
        return self._row_to_user(row)

    def get_by_id(self, user_id: str) -> Optional[UserInDB]:
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()
        if not row:
            return None
        return self._row_to_user(row)

    def list_users(self, limit: int = 100, offset: int = 0) -> list[UserPublic]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset)
            ).fetchall()
        return [
            UserPublic(
                id=r["id"], email=r["email"], full_name=r["full_name"],
                role=UserRole(r["role"]), is_active=bool(r["is_active"]),
                created_at=str(r["created_at"])
            )
            for r in rows
        ]

    def update_role(self, user_id: str, role: UserRole) -> bool:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                "UPDATE users SET role = ? WHERE id = ?", (role.value, user_id)
            )
            conn.commit()
        return cur.rowcount > 0

    def set_active(self, user_id: str, active: bool) -> bool:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                "UPDATE users SET is_active = ? WHERE id = ?", (active, user_id)
            )
            conn.commit()
        return cur.rowcount > 0

    def deactivate(self, user_id: str) -> bool:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                "UPDATE users SET is_active = ? WHERE id = ?", (False, user_id)
            )
            conn.commit()
        return cur.rowcount > 0

    def count(self) -> int:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()
            return row["n"] if row else 0

    @staticmethod
    def _row_to_user(row) -> UserInDB:
        return UserInDB(
            id=row["id"],
            email=row["email"],
            full_name=row["full_name"],
            hashed_password=row["hashed_password"],
            role=UserRole(row["role"]),
            is_active=bool(row["is_active"]),
            created_at=str(row["created_at"]),
        )
