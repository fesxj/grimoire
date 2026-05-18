"""Export package — admin-only data export endpoints."""
from fastapi import APIRouter

from .core import export_tags

router = APIRouter(prefix="/export", tags=["export"])
router.add_api_route(
    "/tags",
    export_tags,
    methods=["GET"],
    summary="Export all tag data as JSON",
)
