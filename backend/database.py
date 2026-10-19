"""
database.py — Couche d'accès aux données (SQLite en local, PostgreSQL en production)
------------------------------------------------------------------------------------
• DATABASE_URL défini  → PostgreSQL (ex. Supabase). Obligatoire en production : le disque
  des fonctions Vercel est éphémère et SQLite y perdrait comptes, quotas et journal.
• DATABASE_URL absent  → SQLite (développement et tests).

Les deux modes exposent la même interface minimale : execute(), executescript(), commit(),
et l'usage en `with` (valide la transaction ou l'annule en cas d'erreur).
Les requêtes sont écrites avec des paramètres `?` ; ils sont convertis en `%s` pour PostgreSQL.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Any

try:
    from .config import settings
except ImportError:
    from config import settings


def is_postgres() -> bool:
    return bool(settings.DATABASE_URL.strip())


def to_pg(sql: str) -> str:
    """Convertit une requête SQLite (`?`) en requête PostgreSQL (`%s`)."""
    return sql.replace("%", "%%").replace("?", "%s")


def split_statements(script: str) -> list[str]:
    """Découpe un script SQL en instructions (supprime les commentaires `--`)."""
    no_comments = re.sub(r"--[^\n]*", "", script)
    return [s.strip() for s in no_comments.split(";") if s.strip()]


class PgConnection:
    """Connexion PostgreSQL éphémère (une par opération, adaptée au mode serverless)."""

    def __init__(self, url: str) -> None:
        import psycopg
        from psycopg.rows import dict_row

        # prepare_threshold=None : compatible avec le pooler « transaction » de Supabase (pgbouncer)
        self._conn = psycopg.connect(
            url, row_factory=dict_row, prepare_threshold=None, connect_timeout=10
        )

    def execute(self, sql: str, params: Any = ()):
        return self._conn.execute(to_pg(sql), params)

    def executescript(self, script: str) -> None:
        for statement in split_statements(script):
            self._conn.execute(statement)

    def commit(self) -> None:
        self._conn.commit()

    def __enter__(self) -> "PgConnection":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        try:
            if exc_type is None:
                self._conn.commit()
            else:
                self._conn.rollback()
        finally:
            self._conn.close()
        return False


def connect(sqlite_path: str):
    """Ouvre une connexion : PostgreSQL si DATABASE_URL est défini, sinon SQLite."""
    if is_postgres():
        return PgConnection(settings.DATABASE_URL.strip())
    conn = sqlite3.connect(sqlite_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn
