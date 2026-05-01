"""Database initialisation, runtime migrations, and FTS5 setup."""
import json

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from .base import Base


def _normalize_tags_in_db(conn) -> None:
    """Lower-case and deduplicate tags in all tag-bearing tables."""
    tables = [
        "game_systems",
        "books",
        "book_folders",
        "generic_maps",
        "map_folders",
        "tokens",
        "token_folders",
    ]
    for table in tables:
        rows = conn.execute(
            text(f"SELECT rowid, tags FROM {table} WHERE tags IS NOT NULL")
        ).fetchall()
        for rowid, raw in rows:
            try:
                tags = json.loads(raw) if isinstance(raw, str) else raw
                if not isinstance(tags, list):
                    continue
                seen: set[str] = set()
                normalized = []
                for t in tags:
                    lowered = str(t).strip().lower()
                    if lowered and lowered not in seen:
                        seen.add(lowered)
                        normalized.append(lowered)
                if normalized != tags:
                    conn.execute(
                        text(f"UPDATE {table} SET tags = :tags WHERE rowid = :rowid"),
                        {"tags": json.dumps(normalized), "rowid": rowid},
                    )
            except Exception:
                pass
    conn.commit()


def init_db(db_path: str):
    """Initialize database and return engine + session factory."""
    engine = create_engine(
        f"sqlite:///{db_path}",
        echo=False,
        connect_args={"timeout": 30, "check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

    Base.metadata.create_all(engine)

    with engine.connect() as conn:
        # Runtime migrations for columns added after initial release
        for migration in [
            "ALTER TABLE books ADD COLUMN index_failed BOOLEAN DEFAULT 0",
            "ALTER TABLE books ADD COLUMN scan_failed BOOLEAN DEFAULT 0",
            "ALTER TABLE books ADD COLUMN is_missing BOOLEAN DEFAULT 0",
            "ALTER TABLE generic_maps ADD COLUMN is_missing BOOLEAN DEFAULT 0",
            "ALTER TABLE tokens ADD COLUMN is_missing BOOLEAN DEFAULT 0",
            "ALTER TABLE users ADD COLUMN opds_token VARCHAR(64)",
            "ALTER TABLE users ADD COLUMN email VARCHAR(254)",
            "ALTER TABLE users ADD COLUMN oidc_subject VARCHAR(255)",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users(email) WHERE email IS NOT NULL",
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_oidc_subject ON users(oidc_subject) WHERE oidc_subject IS NOT NULL",
        ]:
            try:
                conn.execute(text(migration))
                conn.commit()
            except Exception:
                pass  # Column already exists

        try:
            conn.execute(text("ALTER TABLE books ADD COLUMN tags JSON DEFAULT '[]'"))
            conn.commit()
        except Exception:
            pass  # Column already exists

        try:
            conn.execute(
                text("ALTER TABLE game_systems ADD COLUMN is_system_agnostic BOOLEAN DEFAULT 0")
            )
            conn.commit()
        except Exception:
            pass  # Column already exists

        # Normalize all stored tags to lowercase, deduplicating within each row.
        _normalize_tags_in_db(conn)

        conn.execute(
            text(
                """
            CREATE VIRTUAL TABLE IF NOT EXISTS book_search
            USING fts5(
                book_id UNINDEXED,
                page_number UNINDEXED,
                content,
                tokenize='porter unicode61'
            )
        """
            )
        )

        conn.commit()

    Session = sessionmaker(bind=engine)
    return engine, Session
