"""Pydantic schemas for the OIDC API."""
from pydantic import BaseModel


class DiscoverRequest(BaseModel):
    issuer_url: str
