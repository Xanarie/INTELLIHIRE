# backend/app/ai/embeddings.py
#
# NOTE: sentence-transformers (~500MB) is disabled on Render's free tier
# (512MB RAM limit). The similarity() function returns 0.0 so that
# matching.py falls back to keyword-only scoring automatically.
# To re-enable, install sentence-transformers and restore the original
# implementation below.

from __future__ import annotations
from typing import Optional


def similarity(text_a: str, text_b: str, cfg: Optional[object] = None) -> float:
    """
    Semantic similarity between two texts.
    Currently disabled — returns 0.0 to avoid loading the ML model.
    Matching falls back to keyword-only scoring via matching.py.
    """
    return 0.0


# ── Stub exports so nothing else breaks ──────────────────────────────────────

def embed_text(text: str, cfg: Optional[object] = None):
    return None


def embed_texts(texts, cfg: Optional[object] = None):
    return []


def cosine_similarity(vec_a, vec_b) -> float:
    return 0.0