"""Maintenance router — admin-only housekeeping tasks."""

import os

from fastapi import APIRouter, Depends
from sqlalchemy import text

from ..config import SessionLocal, logger
from ..auth import require_admin, CurrentUser
from ..models import Book, GenericMap, Token

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.post("/cleanup-missing", summary="Remove DB entries for missing files")
def cleanup_missing(_: CurrentUser = Depends(require_admin)):
    db = SessionLocal()
    removed = {"books": 0, "maps": 0, "tokens": 0}
    try:
        for book in db.query(Book).all():
            if not os.path.exists(book.filepath):
                logger.info(f"Cleanup: removing missing book '{book.title}' ({book.filepath})")
                db.execute(text("DELETE FROM book_search WHERE book_id = :id"), {"id": book.id})
                db.delete(book)
                removed["books"] += 1

        for m in db.query(GenericMap).all():
            if not os.path.exists(m.filepath):
                logger.info(f"Cleanup: removing missing map '{m.filename}' ({m.filepath})")
                db.delete(m)
                removed["maps"] += 1

        for t in db.query(Token).all():
            if not os.path.exists(t.filepath):
                logger.info(f"Cleanup: removing missing token '{t.filename}' ({t.filepath})")
                db.delete(t)
                removed["tokens"] += 1

        db.commit()
        logger.info(f"Cleanup complete: {removed}")
        return {"removed": removed}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
