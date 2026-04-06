"""Pydantic schemas for the bookmarks API."""
from typing import Optional
from pydantic import BaseModel


class BookmarkCreate(BaseModel):
    book_id: str
    page_number: int
    label: Optional[str] = ""
    notes: Optional[str] = ""
    selected_text: Optional[str] = None


class BookmarkUpdate(BaseModel):
    label: str
    notes: Optional[str] = None
