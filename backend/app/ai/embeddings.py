from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence
import os

import numpy as np

try:
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    raise ImportError(
        "sentence-transformers is not installed. Activate venv, then run:\n"
        "pip install sentence-transformers"
    ) from e


@dataclass(frozen=True)
class EmbeddingConfig:
    """
    Configuration for the embedding model.
    """
    model_name: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    device: Optional[str] = os.getenv("EMBEDDING_DEVICE")  # e.g. "cuda" or "cpu"
    batch_size: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
    normalize: bool = True  # normalize so cosine sim becomes dot product


_MODEL: Optional[SentenceTransformer] = None
_CFG: Optional[EmbeddingConfig] = None


def get_model(cfg: Optional[EmbeddingConfig] = None) -> SentenceTransformer:
    """
    Lazy-load and cache the embedding model so it doesn't reload per request.
    """
    global _MODEL, _CFG
    if cfg is None:
        cfg = EmbeddingConfig()

    if _MODEL is not None and _CFG == cfg:
        return _MODEL

    _MODEL = SentenceTransformer(cfg.model_name, device=cfg.device)
    _CFG = cfg
    return _MODEL


def embed_texts(texts: Sequence[str], cfg: Optional[EmbeddingConfig] = None) -> np.ndarray:
    """
    Embed a list of texts -> (n_texts, dim) float32 numpy array.
    """
    if not texts:
        return np.zeros((0, 0), dtype=np.float32)

    cfg = cfg or EmbeddingConfig()
    model = get_model(cfg)

    vecs = model.encode(
        list(texts),
        batch_size=cfg.batch_size,
        convert_to_numpy=True,
        normalize_embeddings=cfg.normalize,
        show_progress_bar=False,
    )
    return np.asarray(vecs, dtype=np.float32)


def embed_text(text: str, cfg: Optional[EmbeddingConfig] = None) -> np.ndarray:
    """
    Embed a single text -> (dim,) float32 numpy array.
    """
    vecs = embed_texts([text], cfg=cfg)
    return vecs[0] if vecs.shape[0] else np.zeros((0,), dtype=np.float32)


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Cosine similarity between two vectors.
    If vectors are normalized, this is equivalent to dot product.
    """
    if vec_a.size == 0 or vec_b.size == 0:
        return 0.0

    denom = float(np.linalg.norm(vec_a) * np.linalg.norm(vec_b))
    if denom == 0.0:
        return 0.0

    return float(np.dot(vec_a, vec_b) / denom)


def similarity(text_a: str, text_b: str, cfg: Optional[EmbeddingConfig] = None) -> float:
    """
    Convenience: embed two texts and return cosine similarity.
    """
    va = embed_text(text_a, cfg=cfg)
    vb = embed_text(text_b, cfg=cfg)
    return cosine_similarity(va, vb)


def top_k_similar(
    query: str,
    candidates: Sequence[str],
    k: int = 5,
    cfg: Optional[EmbeddingConfig] = None,
) -> List[dict]:
    """
    Return top-k most similar candidate strings to the query.
    Output: [{ "index": i, "text": candidates[i], "score": sim }, ...]
    """
    if not candidates:
        return []

    cfg = cfg or EmbeddingConfig()
    q_vec = embed_text(query, cfg=cfg)
    c_vecs = embed_texts(candidates, cfg=cfg)

    # If normalized, cosine sim == dot product
    scores = np.dot(c_vecs, q_vec)

    k = max(1, min(k, len(candidates)))
    top_idx = np.argsort(scores)[::-1][:k]

    return [
        {"index": int(i), "text": candidates[int(i)], "score": float(scores[int(i)])}
        for i in top_idx
    ]
