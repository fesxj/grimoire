"""Library models — game systems, books, and book folders."""
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from .base import Base, _utcnow, _uuid


class GameSystem(Base):
    """A tabletop RPG game system (e.g., D&D 5e, PbtA, Fate)."""

    __tablename__ = "game_systems"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), unique=True, nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, default="")
    publishers = Column(JSON, default=list)
    character_builder_url = Column(String(512), default="")
    cover_image = Column(String(512), default="")
    cover_book_id = Column(String(36), nullable=True)
    tags = Column(JSON, default=list)
    genre = Column(String(100), default="")
    is_explicit = Column(Boolean, default=False)
    is_system_agnostic = Column(Boolean, default=False)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    books = relationship("Book", back_populates="game_system", cascade="all, delete-orphan")


class Book(Base):
    """A single PDF/document in the library."""

    __tablename__ = "books"

    id = Column(String(36), primary_key=True, default=_uuid)
    game_system_id = Column(String(36), ForeignKey("game_systems.id"), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    filename = Column(String(500), nullable=False)
    filepath = Column(String(1000), nullable=False, unique=True)
    relative_path = Column(String(1000), nullable=False)

    category = Column(String(100), default="core", index=True)
    description = Column(Text, default="")
    authors = Column(JSON, default=list)
    publisher = Column(String(255), default="")
    publisher_url = Column(String(512), default="")
    year = Column(Integer, nullable=True)
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    mime_type = Column(String(100), default="application/pdf")
    has_thumbnail = Column(Boolean, default=False)
    tags = Column(JSON, default=list)
    is_explicit = Column(Boolean, default=False)
    indexed = Column(Boolean, default=False)
    index_failed = Column(Boolean, default=False)
    index_error = Column(String(500), default="")
    scan_failed = Column(Boolean, default=False)
    is_missing = Column(Boolean, default=False)

    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    __table_args__ = (Index("ix_books_indexer_queue", "indexed", "mime_type"),)

    game_system = relationship("GameSystem", back_populates="books")


class BookFolder(Base):
    """Tags applied to a book subcategory folder path (e.g. adventure path groupings)."""

    __tablename__ = "book_folders"

    id = Column(String(36), primary_key=True, default=_uuid)
    path = Column(String(1000), nullable=False, unique=True)
    tags = Column(JSON, default=list)
