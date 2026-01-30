# backend/app/ai/utils.py

from __future__ import annotations
import re

_SKILL_ALIASES = {
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "node": "node.js",
    "reactjs": "react",
    "nextjs": "next.js",
}

def normalize_skill(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return _SKILL_ALIASES.get(s, s)

def keyword_hits(text: str, phrase: str) -> bool:
    """
    Basic phrase hit that avoids partial-word false positives.
    """
    text = (text or "").lower()
    phrase = normalize_skill(phrase)
    if not phrase:
        return False
    # word-boundary-ish match
    pattern = r"(^|[^a-z0-9])" + re.escape(phrase) + r"([^a-z0-9]|$)"
    return re.search(pattern, text) is not None
