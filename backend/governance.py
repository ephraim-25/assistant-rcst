"""
governance.py — Gouvernance Backend RCST (A2)
---------------------------------------------
• Suivi des quotas journaliers par utilisateur (SQLite)
• Audit Trail : journal de chaque appel IA (SQLite)
• Accessible par les administrateurs via /api/admin/*
"""
from __future__ import annotations

import sqlite3
import threading
import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, status

try:
    from .config import settings
    from .models import UserRole
except ImportError:
    from config import settings
    from models import UserRole


# ─── Base de données Gouvernance ──────────────────────────────────────────────

class GovernanceDB:
    """
    Gère deux tables SQLite :
    - quota_usage  : compteurs journaliers par (user_id, date)
    - audit_trail  : journal de chaque appel IA
    """
    _lock = threading.Lock()

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS quota_usage (
                    user_id     TEXT NOT NULL,
                    usage_date  TEXT NOT NULL,   -- format ISO: YYYY-MM-DD
                    call_count  INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (user_id, usage_date)
                );

                CREATE TABLE IF NOT EXISTS audit_trail (
                    id               TEXT PRIMARY KEY,
                    user_id          TEXT NOT NULL,
                    user_email       TEXT NOT NULL DEFAULT '',
                    action           TEXT NOT NULL,  -- 'audit', 'chat', 'reformulate', 'convert_apa'
                    model_used       TEXT NOT NULL DEFAULT '',
                    tokens_estimated INTEGER NOT NULL DEFAULT 0,
                    manuscript_hash  TEXT NOT NULL DEFAULT '',   -- SHA-256 tronqué (non PII)
                    status_code      INTEGER NOT NULL DEFAULT 200,
                    error_detail     TEXT NOT NULL DEFAULT '',
                    timestamp        TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_trail_user
                    ON audit_trail (user_id);
                CREATE INDEX IF NOT EXISTS idx_trail_ts
                    ON audit_trail (timestamp DESC);
            """)
            conn.commit()

    # ── Quotas ────────────────────────────────────────────────────────────────

    def get_daily_count(self, user_id: str) -> int:
        today = date.today().isoformat()
        with self._lock, self._connect() as conn:
            row = conn.execute(
                "SELECT call_count FROM quota_usage WHERE user_id=? AND usage_date=?",
                (user_id, today)
            ).fetchone()
        return row["call_count"] if row else 0

    def increment_quota(self, user_id: str) -> int:
        """Incrémente le compteur journalier et retourne la nouvelle valeur."""
        today = date.today().isoformat()
        with self._lock, self._connect() as conn:
            conn.execute(
                """INSERT INTO quota_usage (user_id, usage_date, call_count)
                   VALUES (?, ?, 1)
                   ON CONFLICT(user_id, usage_date)
                   DO UPDATE SET call_count = call_count + 1""",
                (user_id, today)
            )
            conn.commit()
            row = conn.execute(
                "SELECT call_count FROM quota_usage WHERE user_id=? AND usage_date=?",
                (user_id, today)
            ).fetchone()
        return row["call_count"] if row else 1

    def reset_quota(self, user_id: str) -> None:
        """Réinitialise le compteur de l'utilisateur (admin uniquement)."""
        today = date.today().isoformat()
        with self._lock, self._connect() as conn:
            conn.execute(
                "DELETE FROM quota_usage WHERE user_id=? AND usage_date=?",
                (user_id, today)
            )
            conn.commit()

    def all_quotas_today(self) -> list[dict]:
        today = date.today().isoformat()
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT user_id, call_count FROM quota_usage WHERE usage_date=? ORDER BY call_count DESC",
                (today,)
            ).fetchall()
        return [{"user_id": r["user_id"], "call_count": r["call_count"], "date": today} for r in rows]

    # ── Audit Trail ───────────────────────────────────────────────────────────

    def log_event(
        self,
        user_id: str,
        user_email: str,
        action: str,
        model_used: str = "",
        tokens_estimated: int = 0,
        manuscript_hash: str = "",
        status_code: int = 200,
        error_detail: str = "",
    ) -> None:
        """Enregistre une ligne dans le journal d'audit."""
        now = datetime.now(timezone.utc).isoformat()
        with self._lock, self._connect() as conn:
            conn.execute(
                """INSERT INTO audit_trail
                   (id, user_id, user_email, action, model_used, tokens_estimated,
                    manuscript_hash, status_code, error_detail, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (str(uuid.uuid4()), user_id, user_email, action, model_used,
                 tokens_estimated, manuscript_hash, status_code, error_detail, now)
            )
            conn.commit()

    def get_trail(
        self,
        limit: int = 50,
        offset: int = 0,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
    ) -> list[dict]:
        """Retourne le journal d'audit (admin uniquement)."""
        where_clauses = []
        params: list = []
        if user_id:
            where_clauses.append("user_id = ?")
            params.append(user_id)
        if action:
            where_clauses.append("action = ?")
            params.append(action)

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        params += [limit, offset]

        with self._lock, self._connect() as conn:
            rows = conn.execute(
                f"""SELECT id, user_id, user_email, action, model_used,
                           tokens_estimated, status_code, error_detail, timestamp
                    FROM audit_trail
                    {where_sql}
                    ORDER BY timestamp DESC
                    LIMIT ? OFFSET ?""",
                params
            ).fetchall()
        return [dict(r) for r in rows]

    def count_trail(self) -> int:
        with self._lock, self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM audit_trail").fetchone()[0]


# ─── Instance partagée ────────────────────────────────────────────────────────

_governance_db: Optional[GovernanceDB] = None


def get_governance_db() -> GovernanceDB:
    """Injection de dépendance FastAPI."""
    global _governance_db
    if _governance_db is None:
        _governance_db = GovernanceDB(settings.SQLITE_DB_PATH)
    return _governance_db


# ─── Helper : vérification + incrément de quota ───────────────────────────────

def check_and_increment_quota(
    user_id: str,
    role: UserRole,
    db: GovernanceDB,
) -> int:
    """
    Vérifie le quota journalier de l'utilisateur.
    - Si dépassé → lève HTTP 429 Too Many Requests.
    - Sinon → incrémente et retourne le nouveau compteur.
    """
    limit = (
        settings.DAILY_QUOTA_ADMIN
        if role == UserRole.ADMIN
        else settings.DAILY_QUOTA_REVIEWER
    )
    current = db.get_daily_count(user_id)
    if current >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Quota journalier atteint ({current}/{limit} appels). "
                f"Réessayez demain ou contactez l'administrateur pour une augmentation."
            ),
            headers={"Retry-After": "86400"},
        )
    return db.increment_quota(user_id)
