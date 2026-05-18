"""Media models — generic maps and tokens, plus their folder tag tables."""
from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text

from .base import Base, _utcnow, _uuid


class GenericMap(Base):
    """A generic map (not tied to a specific game system)."""

    __tablename__ = "generic_maps"

    id = Column(String(36), primary_key=True, default=_uuid)
    filename = Column(String(500), nullable=False)
    filepath = Column(String(1000), nullable=False, unique=True)
    relative_path = Column(String(1000), nullable=False)
    description = Column(Text, default="")
    tags = Column(JSON, default=list)
    map_type = Column(String(100), default="")
    grid_size = Column(String(50), default="")
    file_size = Column(Integer, default=0)
    has_thumbnail = Column(Boolean, default=False)
    is_missing = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)


class MapFolder(Base):
    """Tags applied to a map folder path."""

    __tablename__ = "map_folders"

    id = Column(String(36), primary_key=True, default=_uuid)
    path = Column(String(1000), nullable=False, unique=True)
    tags = Column(JSON, default=list)


class Token(Base):
    """A token image (character, creature, object) for use on maps."""

    __tablename__ = "tokens"

    id = Column(String(36), primary_key=True, default=_uuid)
    filename = Column(String(500), nullable=False)
    filepath = Column(String(1000), nullable=False, unique=True)
    relative_path = Column(String(1000), nullable=False)
    description = Column(Text, default="")
    tags = Column(JSON, default=list)
    is_explicit = Column(Boolean, default=False)
    file_size = Column(Integer, default=0)
    has_thumbnail = Column(Boolean, default=False)
    is_missing = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_utcnow)


class TokenFolder(Base):
    """Tags applied to a token folder path."""

    __tablename__ = "token_folders"

    id = Column(String(36), primary_key=True, default=_uuid)
    path = Column(String(1000), nullable=False, unique=True)
    tags = Column(JSON, default=list)
