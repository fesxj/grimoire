"""Full-text search endpoint for Grimoire."""

from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import cast, String, or_, text

from ..config import SessionLocal
from ..models import GameSystem, Book, GenericMap, MapFolder, Token, TokenFolder

router = APIRouter(tags=["search"])

# Lower number = shown first in results
_CATEGORY_PRIORITY = {
    "core": 0,
    "supplement": 1,
    "adventure": 2,
    "character-sheet": 3,
    "map": 4,
    "handout": 5,
    "homebrew": 6,
}


@router.get(
    "/search",
    summary="Full-text search",
    description="Searches indexed book pages using SQLite FTS5. Optionally scope to a single book (`book_id`) or game system (`system_id`). Returns snippets with HTML `<mark>` highlights.",
)
def search_library(
    q: str = Query(..., min_length=2),
    limit: int = Query(50, le=200),
    book_id: Optional[str] = None,
    system_id: Optional[str] = None,
):
    db = SessionLocal()
    try:
        if book_id:
            sql = text(
                """
                SELECT book_id, page_number,
                       snippet(book_search, 2, '<mark>', '</mark>', '...', 40) as snippet,
                       rank
                FROM book_search
                WHERE content MATCH :query AND book_id = :book_id
                ORDER BY rank
                LIMIT :limit
            """
            )
            rows = db.execute(sql, {"query": q, "book_id": book_id, "limit": limit}).fetchall()
        elif system_id:
            sql = text(
                """
                SELECT book_id, page_number,
                       snippet(book_search, 2, '<mark>', '</mark>', '...', 40) as snippet,
                       rank
                FROM book_search
                WHERE content MATCH :query
                  AND book_id IN (SELECT id FROM books WHERE game_system_id = :system_id)
                ORDER BY rank
                LIMIT :limit
            """
            )
            rows = db.execute(sql, {"query": q, "system_id": system_id, "limit": limit}).fetchall()
        else:
            sql = text(
                """
                SELECT book_id, page_number,
                       snippet(book_search, 2, '<mark>', '</mark>', '...', 40) as snippet,
                       rank
                FROM book_search
                WHERE content MATCH :query
                ORDER BY rank
                LIMIT :limit
            """
            )
            rows = db.execute(sql, {"query": q, "limit": limit}).fetchall()

        enriched = []
        book_cache = {}
        for row in rows:
            bid = row[0]
            if bid not in book_cache:
                book = db.query(Book).filter_by(id=bid).first()
                if book:
                    system = (
                        db.query(GameSystem).filter_by(id=book.game_system_id).first()
                        if book.game_system_id
                        else None
                    )
                    book_cache[bid] = {
                        "id": book.id,
                        "title": book.title,
                        "game_system": system.name if system else "",
                        "category": book.category,
                    }
            if bid in book_cache:
                enriched.append(
                    {**book_cache[bid], "page_number": row[1], "snippet": row[2], "_rank": row[3]}
                )

        # Re-sort: category priority first, then BM25 rank (more negative = better match)
        enriched.sort(key=lambda r: (_CATEGORY_PRIORITY.get(r["category"], 99), r["_rank"]))
        for r in enriched:
            del r["_rank"]

        maps = []
        tokens = []
        if not book_id and not system_id:
            maps = _search_maps(db, q)
            tokens = _search_tokens(db, q)

        return {
            "query": q,
            "total": len(enriched) + len(maps) + len(tokens),
            "results": enriched,
            "maps": maps,
            "tokens": tokens,
        }
    finally:
        db.close()


def _search_maps(db, q: str) -> list:
    term = f"%{q}%"
    direct = (
        db.query(GenericMap)
        .filter(
            or_(
                GenericMap.filename.ilike(term),
                cast(GenericMap.tags, String).ilike(term),
            )
        )
        .limit(50)
        .all()
    )
    seen = {m.id for m in direct}

    matching_folders = (
        db.query(MapFolder)
        .filter(
            or_(
                MapFolder.path.ilike(term),
                cast(MapFolder.tags, String).ilike(term),
            )
        )
        .all()
    )
    extra = []
    for folder in matching_folders:
        for m in (
            db.query(GenericMap).filter(GenericMap.relative_path.ilike(f"{folder.path}%")).all()
        ):
            if m.id not in seen:
                seen.add(m.id)
                extra.append(m)

    return [
        {"id": m.id, "filename": m.filename, "relative_path": m.relative_path, "tags": m.tags}
        for m in (direct + extra)[:50]
    ]


def _search_tokens(db, q: str) -> list:
    term = f"%{q}%"
    direct = (
        db.query(Token)
        .filter(
            or_(
                Token.filename.ilike(term),
                cast(Token.tags, String).ilike(term),
            )
        )
        .limit(50)
        .all()
    )
    seen = {t.id for t in direct}

    matching_folders = (
        db.query(TokenFolder)
        .filter(
            or_(
                TokenFolder.path.ilike(term),
                cast(TokenFolder.tags, String).ilike(term),
            )
        )
        .all()
    )
    extra = []
    for folder in matching_folders:
        for t in db.query(Token).filter(Token.relative_path.ilike(f"{folder.path}%")).all():
            if t.id not in seen:
                seen.add(t.id)
                extra.append(t)

    return [
        {"id": t.id, "filename": t.filename, "relative_path": t.relative_path, "tags": t.tags}
        for t in (direct + extra)[:50]
    ]
