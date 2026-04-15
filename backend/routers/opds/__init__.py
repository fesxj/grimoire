"""OPDS catalog package — public feed endpoints authenticated by per-user token."""
from fastapi import APIRouter

from .core import catalog, catalog_all, book_entry, download_book

router = APIRouter(prefix="/opds", tags=["opds"])

router.add_api_route(
    "/{token}",
    catalog,
    methods=["GET"],
    summary="OPDS root catalog",
    response_class=None,
)
router.add_api_route(
    "/{token}/all",
    catalog_all,
    methods=["GET"],
    summary="OPDS all-books feed",
    response_class=None,
)
router.add_api_route(
    "/{token}/entry/{book_id}",
    book_entry,
    methods=["GET"],
    summary="OPDS single book entry",
    response_class=None,
)
router.add_api_route(
    "/{token}/download/{book_id}",
    download_book,
    methods=["GET"],
    summary="Download a book via OPDS token",
)
