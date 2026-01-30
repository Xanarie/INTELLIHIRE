# backend/app/ai/matching.py

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from app.ai.embeddings import similarity
from app.ai.utils import normalize_skill, keyword_hits


@dataclass(frozen=True)
class MatchConfig:
    # weights must sum to 100 for easy interpretation
    w_must_have: int = 40
    w_similarity: int = 30
    w_nice_to_have: int = 10
    w_experience: int = 20

    # thresholds
    must_have_knockout_ratio: float = 0.60  # <60% must-haves => cap score
    cap_if_knockout: float = 49.0

    # bucket thresholds
    highly_qualified: float = 80.0
    qualified: float = 65.0
    needs_review: float = 50.0


def _bucket(score: float, cfg: MatchConfig) -> str:
    if score >= cfg.highly_qualified:
        return "Highly Qualified"
    if score >= cfg.qualified:
        return "Qualified"
    if score >= cfg.needs_review:
        return "Needs Review"
    return "Not Qualified"


def _normalize_list(items: Optional[Sequence[str]]) -> List[str]:
    if not items:
        return []
    out = []
    for x in items:
        x = (x or "").strip()
        if x:
            out.append(normalize_skill(x))
    # unique while preserving order
    seen = set()
    uniq = []
    for x in out:
        if x not in seen:
            seen.add(x)
            uniq.append(x)
    return uniq


def must_have_coverage(candidate_text: str, must_haves: Sequence[str]) -> Tuple[float, List[str], List[str]]:
    """
    Returns: ratio, matched, missing
    Matching strategy: keyword/phrase presence in candidate_text (after normalization).
    """
    musts = _normalize_list(must_haves)
    if not musts:
        return 1.0, [], []

    matched = []
    missing = []
    for m in musts:
        if keyword_hits(candidate_text, m):
            matched.append(m)
        else:
            missing.append(m)

    ratio = len(matched) / max(1, len(musts))
    return ratio, matched, missing


def nice_to_have_coverage(candidate_text: str, nice_to_haves: Sequence[str]) -> float:
    nice = _normalize_list(nice_to_haves)
    if not nice:
        return 0.0
    hits = sum(1 for n in nice if keyword_hits(candidate_text, n))
    return hits / max(1, len(nice))


def experience_fit(years_candidate: Optional[float], years_required: Optional[float]) -> float:
    """
    Returns 0..1 score based on years experience.
    If requirement is missing, return neutral 0.5.
    """
    if years_required is None:
        return 0.5
    if years_candidate is None:
        return 0.0
    if years_candidate >= years_required:
        return 1.0
    # partial credit
    return max(0.0, years_candidate / max(0.1, years_required))


def score_applicant(
    candidate_text: str,
    job_text: str,
    must_haves: Optional[Sequence[str]] = None,
    nice_to_haves: Optional[Sequence[str]] = None,
    years_candidate: Optional[float] = None,
    years_required: Optional[float] = None,
    cfg: Optional[MatchConfig] = None,
) -> Dict:
    """
    Main entrypoint. Returns explainable scoring output.
    """
    cfg = cfg or MatchConfig()

    cand_text = (candidate_text or "").strip().lower()
    job_text = (job_text or "").strip()

    # 1) semantic similarity (0..1)
    sim = similarity(cand_text, job_text)

    # 2) must-have coverage (0..1) + matched/missing lists
    must_ratio, matched_must, missing_must = must_have_coverage(cand_text, must_haves or [])

    # 3) nice-to-have coverage (0..1)
    nice_ratio = nice_to_have_coverage(cand_text, nice_to_haves or [])

    # 4) experience fit (0..1)
    exp_ratio = experience_fit(years_candidate, years_required)

    # weighted score 0..100
    score = 0.0
    score += cfg.w_must_have * must_ratio
    score += cfg.w_similarity * sim
    score += cfg.w_nice_to_have * nice_ratio
    score += cfg.w_experience * exp_ratio

    knockout = (len(_normalize_list(must_haves)) > 0) and (must_ratio < cfg.must_have_knockout_ratio)
    if knockout:
        score = min(score, cfg.cap_if_knockout)

    score = round(score, 1)
    bucket = _bucket(score, cfg)

    return {
        "score": score,
        "bucket": bucket,
        "knockout": knockout,
        "breakdown": {
            "semantic_similarity": round(sim, 3),
            "must_have_ratio": round(must_ratio, 3),
            "nice_to_have_ratio": round(nice_ratio, 3),
            "experience_ratio": round(exp_ratio, 3),
            "weights": {
                "must_have": cfg.w_must_have,
                "similarity": cfg.w_similarity,
                "nice_to_have": cfg.w_nice_to_have,
                "experience": cfg.w_experience,
            },
        },
        "must_haves": {
            "matched": matched_must,
            "missing": missing_must,
        },
    }
