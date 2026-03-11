# backend/app/cache.py
"""
Simple in-memory TTL cache for read-heavy Firestore endpoints.
Reduces repeated identical reads within the same Render process lifetime.
"""
import time
from typing import Any, Optional

_store: dict[str, tuple[Any, float]] = {}


def get(key: str) -> Optional[Any]:
    entry = _store.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def set(key: str, value: Any, ttl_seconds: int = 30) -> None:
    _store[key] = (value, time.time() + ttl_seconds)


def invalidate(key: str) -> None:
    _store.pop(key, None)


def invalidate_prefix(prefix: str) -> None:
    keys = [k for k in _store if k.startswith(prefix)]
    for k in keys:
        del _store[k]