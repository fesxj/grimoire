"""Shared configuration, database, and cache setup for Grimoire."""
import os
import logging
from typing import Optional
from .models import init_db

VERSION = os.environ.get("APP_VERSION", "1.0.0")

LIBRARY_PATH = os.environ.get("LIBRARY_PATH", "./library")
DATA_PATH = os.environ.get("DATA_PATH", "./data")
DB_PATH = os.path.join(DATA_PATH, "grimoire.db")
THUMB_DIR = os.path.join(DATA_PATH, "thumbnails")
PAGE_CACHE_DIR = os.path.join(DATA_PATH, "page_cache")
VALKEY_URL = os.environ.get("VALKEY_URL", "")
_PAGE_CACHE_HEADERS = {"Cache-Control": "max-age=31536000, immutable"}

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger("grimoire")

os.makedirs(DATA_PATH, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)
os.makedirs(os.path.join(THUMB_DIR, "books"), exist_ok=True)
os.makedirs(os.path.join(THUMB_DIR, "maps"), exist_ok=True)
os.makedirs(PAGE_CACHE_DIR, exist_ok=True)

engine, SessionLocal = init_db(DB_PATH)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Optional Valkey page cache
_valkey: Optional[object] = None
if VALKEY_URL:
    try:
        import redis as _redis_mod  # type: ignore[import-untyped]

        _valkey = _redis_mod.from_url(VALKEY_URL, decode_responses=False)
        _valkey.ping()
        logger.info(f"Valkey page cache connected: {VALKEY_URL}")
    except Exception as e:
        logger.warning(f"Valkey connection failed, falling back to disk cache: {e}")
        _valkey = None
