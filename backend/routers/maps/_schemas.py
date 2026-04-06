"""Pydantic schemas for the maps API."""
from typing import Optional
from pydantic import BaseModel


class MapUpdate(BaseModel):
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    map_type: Optional[str] = None
    grid_size: Optional[str] = None


class FolderTagsUpdate(BaseModel):
    path: str
    tags: list[str]
