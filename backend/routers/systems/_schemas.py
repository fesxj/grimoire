"""Pydantic schemas for the systems API."""
from typing import Optional

from pydantic import BaseModel, field_validator

from ._helpers import _normalize_tags


class PublisherEntry(BaseModel):
    name: str
    url: str = ""


class BookFolderUpdate(BaseModel):
    path: str
    tags: list[str]

    @field_validator("tags", mode="before")
    @classmethod
    def lowercase_tags(cls, v):
        return _normalize_tags(v)


class GameSystemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    publishers: Optional[list[PublisherEntry]] = None
    character_builder_url: Optional[str] = None
    tags: Optional[list[str]] = None
    genre: Optional[str] = None
    cover_book_id: Optional[str] = None
    is_explicit: Optional[bool] = None

    @field_validator("tags", mode="before")
    @classmethod
    def lowercase_tags(cls, v):
        return _normalize_tags(v) if v is not None else v
