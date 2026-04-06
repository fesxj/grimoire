"""Pydantic schemas for the tokens API."""
from typing import Optional
from pydantic import BaseModel


class TokenUpdate(BaseModel):
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    is_explicit: Optional[bool] = None


class FolderTagsUpdate(BaseModel):
    path: str
    tags: list[str]
