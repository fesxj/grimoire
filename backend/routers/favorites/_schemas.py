"""Pydantic schemas for the favorites API."""
from pydantic import BaseModel


class FavoriteIn(BaseModel):
    item_type: str
    item_id: str
