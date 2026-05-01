"""Application-wide key-value settings model."""
from sqlalchemy import Column, String, Text

from .base import Base


class AppSetting(Base):
    """Application-level key-value settings persisted in the database."""

    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, default="")
