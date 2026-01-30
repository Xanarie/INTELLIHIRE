# backend/app/ai/resume_score.py
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# Reuse your experience estimator if you want:
# from app.ai.summarizer import estimate_experience_years
# (or copy the function here if you prefer to avoid imports)

ACTION_VERBS = [
    "managed", "led", "owned", "built", "designed", "developed", "implemented",
    "improved", "optimized", "reduced", "increased", "launched", "created",
    "automated", "delivered", "supported", "resolved", "coordinated",
    "trained", "mentored", "analyzed", "presented", "collaborated",
]

METRIC_PATTERNS = [
    r"\b\d+%(\b|$)",          # 20%
    r"\b\d+(\.\d+)?\b",       # any number
    r"\b(kpi|sla|roi|okrs?)\b",
    r"\b\d+\s*(users|clients|tickets|projects|hrs|hours|weeks|months|years)\b",
]

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"\+?\d[\d\s().-]{7,}\d")
DATE_RANGE_RE = re.compile(
    r"(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*)?(19|20)\d{2}\s*[-–—to]+\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*)?((19|20)\d{2}|Present|Current|Now)",
    re.IGNORECASE,
)

SECTION_HINTS = {
    "experience": re.compile(r"\bEXPERIENCE\b|\bWORK EXPERIENCE\b|\bEMPLOYMENT\b", re.IGNORECASE),
    "skills": re.compile(r"\bSKILLS\b|\bTOOLS\b|\bTECHNOLOGIES\b", re.IGNORECASE),
    "projects": re.compile(r"\bPROJECTS\b", re.IGNORECASE),
    "education": re.compile(r"\bEDUCATION\b", re.IGNORECASE),
    "certifications": re.compile(r"\bCERTIFICATIONS?\b|\bCERTIFICATES?\b|\bLICENSES?\b", re.IGNORECASE),
}

BULLET_RE = re.compile(r"(^|\n)\s*[-•*]\s+")

@dataclass(frozen=True)
class ResumeScoreResult:
    score: float
    bucket: str
    breakdown: Dict[str, float]
    notes: List[str]


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


def _bucket_from_score(score: float) -> str:
    if score >= 80:
        return "Strong"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Needs Review"
    return "Weak"


def score_resume_quality(resume_text: str) -> Dict:
    """
    Resume-only score (0-100).
    Deterministic heuristics: structure, experience signals, impact/metrics, clarity.
    """
    text = (resume_text or "").strip()
    if not text:
        return {
            "score": 0.0,
            "bucket": "Weak",
            "breakdown": {
                "structure": 0.0,
                "experience_signals": 0.0,
                "impact_signals": 0.0,
                "clarity": 0.0,
            },
            "notes": ["Empty resume text."],
        }

    notes: List[str] = []

    # -------------------------
    # 1) Structure (0-30)
    # -------------------------
    sections_found = sum(1 for _, rx in SECTION_HINTS.items() if rx.search(text))
    structure = 0.0
    if sections_found >= 3:
        structure = 30.0
        notes.append("Good structure: multiple resume sections detected.")
    elif sections_found == 2:
        structure = 22.0
        notes.append("Some structure: at least two sections detected.")
    elif sections_found == 1:
        structure = 14.0
        notes.append("Limited structure: only one section detected.")
    else:
        structure = 8.0
        notes.append("No clear sections detected; resume may be unstructured.")

    # Bonus if bullet formatting exists
    if BULLET_RE.search(text):
        structure = _clamp(structure + 3.0, 0, 30)
        notes.append("Bullet formatting detected.")

    # -------------------------
    # 2) Experience signals (0-30)
    # -------------------------
    exp = 0.0

    # Date ranges are strong evidence of work history
    date_hits = len(DATE_RANGE_RE.findall(text))
    if date_hits >= 3:
        exp += 18.0
        notes.append("Multiple date ranges detected (strong work-history signal).")
    elif date_hits == 2:
        exp += 14.0
        notes.append("Some date ranges detected.")
    elif date_hits == 1:
        exp += 9.0
        notes.append("One date range detected.")
    else:
        exp += 3.0
        notes.append("No date ranges detected; experience timeline unclear.")

    # Role/company-ish signals: very simple heuristic (lines with separators or titles)
    role_like = len(re.findall(r"\b(assistant|engineer|developer|manager|specialist|analyst|designer|lead|supervisor|coordinator)\b", text, re.IGNORECASE))
    if role_like >= 4:
        exp += 12.0
        notes.append("Multiple role-title signals detected.")
    elif role_like >= 2:
        exp += 9.0
    elif role_like == 1:
        exp += 6.0
    else:
        exp += 3.0

    exp = _clamp(exp, 0, 30)

    # -------------------------
    # 3) Impact signals (0-25)
    # -------------------------
    impact = 0.0

    verb_hits = sum(1 for v in ACTION_VERBS if re.search(rf"\b{re.escape(v)}\b", text, re.IGNORECASE))
    if verb_hits >= 8:
        impact += 14.0
        notes.append("Strong action-verb density (impactful bullet writing).")
    elif verb_hits >= 4:
        impact += 10.0
    elif verb_hits >= 2:
        impact += 7.0
    else:
        impact += 3.0

    metric_hits = sum(1 for p in METRIC_PATTERNS if re.search(p, text, re.IGNORECASE))
    if metric_hits >= 3:
        impact += 11.0
        notes.append("Metrics/quantifiers detected (measurable impact signal).")
    elif metric_hits == 2:
        impact += 8.0
    elif metric_hits == 1:
        impact += 5.0
    else:
        impact += 1.0
        notes.append("No measurable metrics detected (consider adding numbers/results).")

    impact = _clamp(impact, 0, 25)

    # -------------------------
    # 4) Clarity / completeness (0-15)
    # -------------------------
    clarity = 0.0

    # Not required, but typically present
    has_email = bool(EMAIL_RE.search(text))
    has_phone = bool(PHONE_RE.search(text))

    if has_email:
        clarity += 4.0
    if has_phone:
        clarity += 3.0

    # Enough text to be meaningful (avoid tiny OCR noise)
    length = len(text)
    if length >= 1500:
        clarity += 8.0
    elif length >= 800:
        clarity += 6.0
    elif length >= 400:
        clarity += 4.0
    else:
        clarity += 2.0
        notes.append("Resume text is quite short; extraction may be incomplete.")

    clarity = _clamp(clarity, 0, 15)

    # -------------------------
    # Final score (0-100)
    # -------------------------
    score = structure + exp + impact + clarity
    score = round(_clamp(score, 0.0, 100.0), 1)
    bucket = _bucket_from_score(score)

    return {
        "score": score,
        "bucket": bucket,
        "breakdown": {
            "structure": round(structure, 1),
            "experience_signals": round(exp, 1),
            "impact_signals": round(impact, 1),
            "clarity": round(clarity, 1),
        },
        "notes": notes[:8],
    }
