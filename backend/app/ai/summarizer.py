# backend/app/ai/summarizer.py
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Sequence

@dataclass(frozen=True)
class SummarizerConfig:
    max_highlights: int = 3
    max_red_flags: int = 3
    max_experience_lines: int = 6
    max_fallback_lines: int = 10


# ----------------------------
# Helpers
# ----------------------------
_MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

def _clean_lines(text: str) -> List[str]:
    lines = []
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        s = s.lstrip("•*-–— ").strip()
        if s:
            lines.append(s)
    return lines

def _take_unique(items: Sequence[str], k: int) -> List[str]:
    seen = set()
    out = []
    for it in items:
        key = it.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it.strip())
        if len(out) >= k:
            break
    return out

def _safe_list(x) -> List[str]:
    if not x:
        return []
    if isinstance(x, list):
        return [str(i) for i in x]
    return [str(x)]

def _extract_between(text: str, start_heading: str, other_headings: Sequence[str]) -> str:
    t = text
    start = t.find(start_heading)
    if start < 0:
        return ""

    after_start = t[start + len(start_heading):]
    next_pos = None
    for h in other_headings:
        p = after_start.find(h)
        if p >= 0:
            next_pos = p if next_pos is None else min(next_pos, p)
    chunk = after_start if next_pos is None else after_start[:next_pos]
    return chunk.strip()

_date_range_re = re.compile(
    r"""
    (?P<a_month>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|
              Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)
    \s*
    (?P<a_year>(?:19|20)\d{2})
    \s*[-–—to]+\s*
    (?:
        (?P<b_month>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|
                  Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)
        \s*
        (?P<b_year>(?:19|20)\d{2})
        |
        (?P<present>Present|Current|Now)
    )
    """,
    re.IGNORECASE | re.VERBOSE,
)

_year_range_re = re.compile(
    r"(?P<a_year>(?:19|20)\d{2})\s*[-–—to]+\s*(?P<b_year>(?:19|20)\d{2}|Present|Current|Now)",
    re.IGNORECASE,
)

def _parse_month(s: str) -> int:
    return _MONTHS.get(s.strip().lower(), 1)

def _months_between(a: datetime, b: datetime) -> int:
    return max(0, (b.year - a.year) * 12 + (b.month - a.month))

def estimate_experience_years(text: str) -> Optional[float]:
    now = datetime.now()
    total_months = 0

    for m in _date_range_re.finditer(text):
        a_month = _parse_month(m.group("a_month"))
        a_year = int(m.group("a_year"))

        if m.group("present"):
            b = now
        else:
            b_month = _parse_month(m.group("b_month"))
            b_year = int(m.group("b_year"))
            b = datetime(b_year, b_month, 1)

        a = datetime(a_year, a_month, 1)
        total_months += _months_between(a, b)

    if total_months == 0:
        for m in _year_range_re.finditer(text):
            a_year = int(m.group("a_year"))
            b_raw = m.group("b_year").lower()
            b_year = now.year if b_raw in ("present", "current", "now") else int(m.group("b_year"))
            total_months += max(0, (b_year - a_year) * 12)

    if total_months <= 0:
        return None

    years = min(40.0, total_months / 12.0)
    return round(years, 1)

def _bucket_label(bucket: str) -> str:
    b = (bucket or "").strip()
    return b if b else "Needs Review"

def _format_paragraph(job_title: Optional[str], bucket: str, score: float, years: Optional[float]) -> str:
    role = job_title or "the role"
    if years is not None:
        return (
            f"This applicant appears to be a **{_bucket_label(bucket)}** fit for **{role}** "
            f"with a score of **{score:.1f}/100**. "
            f"Based on resume timelines, they have approximately **{years} years** of experience. "
            f"Review the highlights below for the most relevant experience and skills."
        )
    return (
        f"This applicant appears to be a **{_bucket_label(bucket)}** fit for **{role}** "
        f"with a score of **{score:.1f}/100**. "
        f"Experience duration is not clearly stated in date ranges, so confirm total years during screening. "
        f"Review the highlights below for the most relevant experience and skills."
    )


# ----------------------------
# Public summarizer
# ----------------------------
def summarize_prescreen(
    *,
    resume_focus_text: str,
    job_title: Optional[str],
    match_result: Optional[Dict],
    cfg: Optional[SummarizerConfig] = None,
) -> Dict:
    cfg = cfg or SummarizerConfig()

    match_result = match_result or {}
    score = float(match_result.get("score", 0.0) or 0.0)
    bucket = str(match_result.get("bucket", "Needs Review") or "Needs Review")

    must_haves = match_result.get("must_haves", {}) or {}
    matched_must = _safe_list(must_haves.get("matched"))
    missing_must = _safe_list(must_haves.get("missing"))

    # Pull experience chunk (if headings exist)
    exp_chunk = _extract_between(
        resume_focus_text,
        "EXPERIENCE",
        other_headings=("PROJECTS", "SKILLS", "CERTIFICATIONS", "EDUCATION"),
    )
    exp_lines = _clean_lines(exp_chunk)[: cfg.max_experience_lines]

    if not exp_lines:
        exp_lines = _clean_lines(resume_focus_text)[: cfg.max_fallback_lines]

    years = estimate_experience_years(resume_focus_text)

    # Highlights: prioritize explicit matches, then experience lines
    highlights: List[str] = []
    if matched_must:
        highlights.append(f"Meets key requirements: {', '.join(_take_unique(matched_must, 6))}.")
    for l in exp_lines[:3]:
        highlights.append(l)
    highlights = _take_unique(highlights, cfg.max_highlights)

    # Red flags: missing must-haves, unclear years, very low score
    red_flags: List[str] = []
    if missing_must:
        red_flags.append(f"Missing key requirements: {', '.join(_take_unique(missing_must, 6))}.")
    if years is None:
        red_flags.append("Work timeline/tenure is unclear from resume date ranges.")
    if score <= 20:
        red_flags.append("Very low score — verify resume content and role fit manually.")
    red_flags = _take_unique(red_flags, cfg.max_red_flags)

    # Suitable role: for now, reflect job_title (later you can compute suggestion)
    suitable_role = job_title or "Needs Review"

    paragraph = _format_paragraph(job_title, bucket, score, years)

    # Build final formatted summary string (what you store in DB and show in UI)
    lines: List[str] = []
    lines.append(paragraph)
    lines.append("")  # spacer
    lines.append("**Highlights:**")
    if highlights:
        for h in highlights:
            lines.append(f"- {h}")
    else:
        lines.append("- None")

    lines.append("")  # spacer
    lines.append("**Red Flags:**")
    if red_flags:
        for r in red_flags:
            lines.append(f"- {r}")
    else:
        lines.append("- None")

    lines.append("")  # spacer
    lines.append("**Suitable Role:**")
    lines.append(f"- {suitable_role}")

    formatted_summary = "\n".join(lines).strip()

    return {
        "summary": formatted_summary,
        "highlights": highlights,
        "red_flags": red_flags,
        "suitable_role": suitable_role,
        "metadata": {
            "score": score,
            "bucket": bucket,
            "matched_must_haves": matched_must,
            "missing_must_haves": missing_must,
            "estimated_years_experience": years,
        },
    }
