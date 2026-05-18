"""Shared SQLAlchemy base, UTC clock, and UUID helper for Grimoire models."""
import datetime
import uuid

from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())
