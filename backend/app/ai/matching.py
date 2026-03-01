# backend/app/ai/matching.py

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from app.ai.embeddings import similarity
from app.ai.utils import normalize_skill, keyword_hits


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class MatchConfig:
    # Weights when explicit must_haves ARE provided (sum = 100)
    w_must_have: int = 40
    w_similarity: int = 35
    w_nice_to_have: int = 10
    w_experience: int = 15

    # Weights when must_haves are AUTO-DERIVED from job text (sum = 100)
    # Similarity gets more authority; keyword coverage is still important.
    w_auto_keyword: int = 35
    w_similarity_auto: int = 50
    w_experience_auto: int = 15

    # Knockout: if <60 % of explicit must-haves are present, cap the score
    must_have_knockout_ratio: float = 0.60
    cap_if_knockout: float = 49.0

    # Bucket thresholds
    highly_qualified: float = 80.0
    qualified: float = 65.0
    needs_review: float = 50.0


# ---------------------------------------------------------------------------
# Bucket helpers
# ---------------------------------------------------------------------------

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
    seen: set = set()
    out: List[str] = []
    for x in items:
        x = normalize_skill((x or "").strip())
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return out


# ---------------------------------------------------------------------------
# Auto keyword extraction from job description
# ---------------------------------------------------------------------------

# Hard-coded stop terms that appear everywhere and carry no signal
_STOP_WORDS = {
    "the", "and", "or", "in", "of", "to", "a", "an", "for", "with",
    "on", "at", "by", "from", "as", "is", "are", "be", "will", "we",
    "you", "our", "your", "this", "that", "have", "has", "can", "all",
    "must", "should", "ability", "knowledge", "experience", "years",
    "work", "working", "strong", "good", "excellent", "great", "team",
    "role", "position", "company", "opportunity", "looking", "seeking",
    "candidate", "applicant", "required", "preferred", "plus", "bonus",
    "proficiency", "proficient", "familiar", "familiarity",
}

# Regex patterns for common multi-word skill / tool phrases (checked first)
_PHRASE_PATTERNS: List[str] = [
    r"adobe\s+\w+",           # Adobe Illustrator, Adobe XD, …
    r"microsoft\s+\w+",       # Microsoft Excel, Microsoft Word, …
    r"google\s+\w+",          # Google Docs, Google Sheets, …
    r"\w+\s+design",          # graphic design, ui design, …
    r"\w+\s+development",     # web development, software development, …
    r"\w+\s+management",      # project management, talent management, …
    r"\w+\s+engineer(?:ing)?",
    r"machine\s+learning",
    r"deep\s+learning",
    r"natural\s+language",
    r"data\s+analysis",
    r"customer\s+service",
    r"social\s+media",
    r"content\s+creation",
    r"brand\s+identity",
    r"visual\s+identity",
    r"motion\s+graphics",
    r"ui\s*/\s*ux",
    r"user\s+experience",
    r"user\s+interface",
    r"front.?end",
    r"back.?end",
    r"full.?stack",
]

_PHRASE_RE = re.compile(
    "|".join(r"(?:" + p + r")" for p in _PHRASE_PATTERNS),
    re.IGNORECASE,
)

# Single technical / role keywords worth extracting
_SINGLE_SKILL_RE = re.compile(
    r"\b("
    # Design tools
    r"photoshop|illustrator|indesign|figma|sketch|canva|xd|aftereffects|premiere|lightroom"
    r"|blender|maya|cinema4d|zbrush"
    # Dev / data
    r"|python|javascript|typescript|java|kotlin|swift|golang|rust|ruby|php|scala"
    r"|react|angular|vue|nextjs|django|flask|fastapi|nodejs|express"
    r"|sql|mysql|postgresql|mongodb|redis|elasticsearch"
    r"|docker|kubernetes|aws|azure|gcp|terraform|ansible"
    r"|tensorflow|pytorch|scikit|pandas|numpy|tableau|powerbi"
    # Office / admin
    r"|excel|word|powerpoint|outlook|salesforce|hubspot|jira|confluence|notion|asana|trello"
    r"|quickbooks|sap|oracle|zendesk"
    # Design / marketing
    r"|typography|branding|wireframe|prototype|mockup|storyboard"
    r"|seo|sem|ppc|analytics|copywriting|content|photography|videography"
    # HR / operations
    r"|recruitment|onboarding|payroll|scheduling|budgeting|forecasting"
    r"|compliance|auditing|procurement|logistics|supply\s+chain"
    # Soft skills with high signal
    r"|bilingual|multilingual|cpa|mba|pmp|agile|scrum|kanban|lean|six\s+sigma"
    r")\b",
    re.IGNORECASE,
)

# Role/title words — very strong signal for whether a person fits the JD domain
_ROLE_TITLE_RE = re.compile(
    r"\b("
    r"designer|developer|engineer|analyst|manager|director|coordinator|specialist"
    r"|administrator|assistant|executive|officer|consultant|architect|scientist"
    r"|writer|editor|photographer|videographer|illustrator|animator|strategist"
    r"|recruiter|accountant|auditor|counselor|advisor|representative|supervisor"
    r"|technician|programmer|researcher|planner|operator"
    r")\b",
    re.IGNORECASE,
)


def extract_job_keywords(job_text: str, max_keywords: int = 20) -> List[str]:
    """
    Auto-extract the most signal-rich keywords from a raw job description.
    Returns a deduplicated list of normalised skill/role terms.
    Priority: multi-word phrases > single skill tokens > role title words.
    """
    text = (job_text or "").lower()
    found: List[str] = []
    seen: set = set()

    def _add(term: str) -> None:
        t = normalize_skill(term.strip())
        if t and t not in seen and t not in _STOP_WORDS and len(t) > 2:
            seen.add(t)
            found.append(t)

    # 1) Multi-word phrases (highest priority)
    for m in _PHRASE_RE.finditer(text):
        _add(m.group(0))

    # 2) Single skill tokens
    for m in _SINGLE_SKILL_RE.finditer(text):
        _add(m.group(1))

    # 3) Role title words (only if not already found via phrase)
    for m in _ROLE_TITLE_RE.finditer(text):
        _add(m.group(1))

    return found[:max_keywords]


# ---------------------------------------------------------------------------
# Coverage functions
# ---------------------------------------------------------------------------

def must_have_coverage(
    candidate_text: str,
    must_haves: Sequence[str],
) -> Tuple[float, List[str], List[str]]:
    """
    Returns (ratio 0..1, matched list, missing list).
    When the list is empty returns 0.5 (neutral) — NOT 1.0.
    Callers that truly mean "no requirements" should pass nothing and
    expect a neutral contribution rather than a free perfect score.
    """
    musts = _normalize_list(must_haves)
    if not musts:
        return 0.5, [], []

    matched, missing = [], []
    for m in musts:
        (matched if keyword_hits(candidate_text, m) else missing).append(m)

    ratio = len(matched) / max(1, len(musts))
    return ratio, matched, missing


def nice_to_have_coverage(candidate_text: str, nice_to_haves: Sequence[str]) -> float:
    nice = _normalize_list(nice_to_haves)
    if not nice:
        return 0.0
    hits = sum(1 for n in nice if keyword_hits(candidate_text, n))
    return hits / max(1, len(nice))


def experience_fit(
    years_candidate: Optional[float],
    years_required: Optional[float],
) -> float:
    """0..1. Neutral 0.5 when requirement is unspecified."""
    if years_required is None:
        return 0.5
    if years_candidate is None:
        return 0.0
    if years_candidate >= years_required:
        return 1.0
    return max(0.0, years_candidate / max(0.1, years_required))


# ---------------------------------------------------------------------------
# Main scorer
# ---------------------------------------------------------------------------

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
    Score a candidate against a job description.

    Two modes:
    - Explicit mode: caller passes must_haves (e.g. from a structured form).
      Uses w_must_have / w_similarity / w_nice_to_have / w_experience weights.
    - Auto mode: no must_haves supplied; keywords are extracted from job_text.
      Uses w_auto_keyword / w_similarity_auto / w_experience_auto weights.
      This prevents an empty list from handing out a free 40-point must_have score.
    """
    cfg = cfg or MatchConfig()

    cand_text = (candidate_text or "").strip().lower()
    job_lower = (job_text or "").strip().lower()

    explicit_mode = bool(_normalize_list(must_haves))

    # ── Semantic similarity ────────────────────────────────────────────────
    sim = similarity(cand_text, job_lower)

    # ── Must-have / keyword coverage ──────────────────────────────────────
    if explicit_mode:
        must_ratio, matched_must, missing_must = must_have_coverage(cand_text, must_haves or [])
        keyword_ratio = must_ratio
    else:
        # Auto-derive keywords from the job description
        auto_keywords = extract_job_keywords(job_lower)
        if auto_keywords:
            keyword_ratio_raw, matched_must, missing_must = must_have_coverage(cand_text, auto_keywords)
            keyword_ratio = keyword_ratio_raw
        else:
            # Truly no extractable keywords → fall back to neutral
            keyword_ratio, matched_must, missing_must = 0.5, [], []

    # ── Nice-to-haves ─────────────────────────────────────────────────────
    nice_ratio = nice_to_have_coverage(cand_text, nice_to_haves or [])

    # ── Experience fit ────────────────────────────────────────────────────
    exp_ratio = experience_fit(years_candidate, years_required)

    # ── Weighted score ────────────────────────────────────────────────────
    if explicit_mode:
        score = (
            cfg.w_must_have   * must_ratio
            + cfg.w_similarity  * sim
            + cfg.w_nice_to_have * nice_ratio
            + cfg.w_experience  * exp_ratio
        )
    else:
        score = (
            cfg.w_auto_keyword    * keyword_ratio
            + cfg.w_similarity_auto * sim
            + cfg.w_experience_auto * exp_ratio
        )

    # ── Knockout (explicit mode only) ─────────────────────────────────────
    knockout = False
    if explicit_mode:
        knockout = (must_ratio < cfg.must_have_knockout_ratio)
        if knockout:
            score = min(score, cfg.cap_if_knockout)

    score = round(score, 1)
    bucket = _bucket(score, cfg)

    return {
        "score": score,
        "bucket": bucket,
        "knockout": knockout,
        "mode": "explicit" if explicit_mode else "auto",
        "breakdown": {
            "semantic_similarity":  round(sim, 3),
            "keyword_coverage":     round(keyword_ratio, 3),
            "nice_to_have_ratio":   round(nice_ratio, 3),
            "experience_ratio":     round(exp_ratio, 3),
            "weights": (
                {
                    "must_have":    cfg.w_must_have,
                    "similarity":   cfg.w_similarity,
                    "nice_to_have": cfg.w_nice_to_have,
                    "experience":   cfg.w_experience,
                }
                if explicit_mode else
                {
                    "keyword":      cfg.w_auto_keyword,
                    "similarity":   cfg.w_similarity_auto,
                    "experience":   cfg.w_experience_auto,
                }
            ),
        },
        "must_haves": {
            "matched": matched_must,
            "missing": missing_must,
        },
    }