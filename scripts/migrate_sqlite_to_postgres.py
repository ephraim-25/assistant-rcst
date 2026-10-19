#!/usr/bin/env python3
"""
Copie les données d'un fichier SQLite RCST vers PostgreSQL (idempotent : les lignes déjà
présentes sont ignorées).

Usage :
    DATABASE_URL="postgresql://..." python scripts/migrate_sqlite_to_postgres.py backend/rcst_data.db
"""
from __future__ import annotations

import os
import sqlite3
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

TABLES = {
    "users": ["id", "email", "full_name", "hashed_password", "role", "is_active", "created_at"],
    "quota_usage": ["user_id", "usage_date", "call_count"],
    "audit_trail": ["id", "user_id", "user_email", "action", "model_used", "tokens_estimated",
                    "manuscript_hash", "status_code", "error_detail", "timestamp"],
    "submission_dispatches": ["submission_id", "approved_by_id", "approved_by_email",
                              "approved_by_name", "editor_role", "comments",
                              "dispatch_status", "timestamp"],
}


def main(sqlite_path: str) -> None:
    if not os.environ.get("DATABASE_URL"):
        sys.exit("DATABASE_URL (PostgreSQL) est requis.")
    if not os.path.exists(sqlite_path):
        sys.exit(f"Fichier SQLite introuvable : {sqlite_path}")

    from config import settings  # noqa: E402  (après ajustement du chemin)
    from database import connect  # noqa: E402
    from models import UserDB  # noqa: E402
    from governance import GovernanceDB  # noqa: E402

    UserDB(settings.SQLITE_DB_PATH)        # crée les tables dans PostgreSQL
    GovernanceDB(settings.SQLITE_DB_PATH)

    src = sqlite3.connect(sqlite_path)
    src.row_factory = sqlite3.Row
    with connect(settings.SQLITE_DB_PATH) as dst:
        for table, cols in TABLES.items():
            try:
                rows = src.execute(f"SELECT {', '.join(cols)} FROM {table}").fetchall()
            except sqlite3.OperationalError:
                print(f"{table}: absente de la source, ignorée")
                continue
            sql = (f"INSERT INTO {table} ({', '.join(cols)}) "
                   f"VALUES ({', '.join('?' for _ in cols)}) ON CONFLICT DO NOTHING")
            for r in rows:
                dst.execute(sql, tuple(r[c] for c in cols))
            print(f"{table}: {len(rows)} ligne(s) lues")
    print("Migration terminée.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
