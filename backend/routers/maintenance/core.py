"""Maintenance endpoint handlers — admin-only housekeeping."""
from fastapi import Depends, HTTPException

from ...auth import CurrentUser, require_admin
from ...config import SessionLocal, logger
from ._helpers import _do_cleanup


def cleanup_missing(_: CurrentUser = Depends(require_admin)):
    from ..library import _helpers as _lib

    logger.debug("Cleanup: manual trigger received")
    if _lib._get_status()["running"]:
        logger.debug("Cleanup: blocked — library scan is currently running")
        raise HTTPException(
            status_code=409,
            detail="A library scan is already running; retry after it completes.",
        )

    logger.debug("Cleanup: no scan running, proceeding")
    db = SessionLocal()
    try:
        removed = _do_cleanup(db)
        logger.info(f"Cleanup complete: {removed}")
        return {"removed": removed}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
