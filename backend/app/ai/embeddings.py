from __future__ import annotations
from typing import Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity as _cos

def similarity(text_a: str, text_b: str, cfg: Optional[object] = None) -> float:
    if not text_a or not text_b:
        return 0.0
    try:
        vecs = TfidfVectorizer(stop_words='english').fit_transform([text_a, text_b])
        return float(_cos(vecs[0], vecs[1])[0, 0])
    except Exception:
        return 0.0

def embed_text(text: str, cfg: Optional[object] = None):
    return None

def embed_texts(texts, cfg: Optional[object] = None):
    return []

def cosine_similarity(vec_a, vec_b) -> float:
    return 0.0