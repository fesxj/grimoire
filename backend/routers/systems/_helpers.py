"""Shared helpers for the systems router."""


def _normalize_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for t in tags:
        lowered = t.strip().lower()
        if lowered and lowered not in seen:
            seen.add(lowered)
            result.append(lowered)
    return result
