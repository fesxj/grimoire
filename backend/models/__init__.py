"""Database models for Grimoire.

Models are organised by domain (library, media, users, campaigns, settings)
and re-exported here so callers can keep using ``from backend.models import X``.
"""

from .base import Base
from .campaigns import (
    Campaign,
    CampaignMember,
    CampaignResource,
    CampaignSchedule,
    GMSessionNote,
    PlayerSessionNote,
    SessionAvailability,
    SessionNote,
)
from .db import init_db
from .library import Book, BookFolder, GameSystem
from .media import GenericMap, MapFolder, Token, TokenFolder
from .settings import AppSetting
from .users import Bookmark, Favorite, User

__all__ = [
    "Base",
    "init_db",
    # Library
    "GameSystem",
    "Book",
    "BookFolder",
    # Media
    "GenericMap",
    "MapFolder",
    "Token",
    "TokenFolder",
    # Users
    "User",
    "Bookmark",
    "Favorite",
    # Campaigns
    "Campaign",
    "CampaignMember",
    "CampaignResource",
    "SessionNote",
    "PlayerSessionNote",
    "GMSessionNote",
    "CampaignSchedule",
    "SessionAvailability",
    # Settings
    "AppSetting",
]
