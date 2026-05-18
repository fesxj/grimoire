"""Shared search helpers and category prioritization for the search router."""
from sqlalchemy import String, cast, or_

from ...models import GenericMap, MapFolder, Token, TokenFolder


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
