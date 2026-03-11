# backend/app/ai/pdf_extract.py
from __future__ import annotations

from fileinput import filename
import os
import re
import subprocess
import tempfile
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple


# Fast path (text-based PDFs)
try:
    import fitz  # PyMuPDF
except ImportError as e:
    raise ImportError(
        "PyMuPDF is not installed. Activate venv, then run:\n"
        "pip install pymupdf"
    ) from e


@dataclass(frozen=True)
class PdfExtractConfig:
    """
    PDF extraction configuration.
    - enable_ocr: fallback to OCR if PDF appears scanned/image-only
    - min_text_chars_for_non_scanned: if extracted text is below this, treat as scanned
    - max_pages_for_ocr: safety cap; resumes are usually 1–3 pages
    """
    enable_ocr: bool = True
    min_text_chars_for_non_scanned: int = 300
    max_pages_for_ocr: int = 5


# ----------------------------
# Cleaning / normalization
# ----------------------------
_WS_RE = re.compile(r"[ \t]+")
_MANY_NL_RE = re.compile(r"\n{3,}")


def clean_text(text: str) -> str:
    """
    Normalize whitespace without destroying line structure too much.
    """
    text = text.replace("\x00", " ").replace("\ufeff", " ")
    # keep newlines, collapse repeated spaces/tabs
    text = _WS_RE.sub(" ", text)
    # trim whitespace around newlines
    text = "\n".join(line.strip() for line in text.splitlines())
    # collapse 3+ newlines to 2
    text = _MANY_NL_RE.sub("\n\n", text)
    return text.strip()


def is_probably_scanned(text: str, cfg: PdfExtractConfig) -> bool:
    """
    Heuristic: scanned PDFs often return empty/very short extracted text.
    """
    return len(text.strip()) < cfg.min_text_chars_for_non_scanned


# ----------------------------
# PyMuPDF extraction (fast)
# ----------------------------
def extract_text_pymupdf(pdf_path: str) -> str:
    """
    Extract visible text from a PDF using PyMuPDF.
    """
    doc = fitz.open(pdf_path)
    parts: List[str] = []
    for page in doc:
        parts.append(page.get_text("text"))
    doc.close()
    return "\n".join(parts).strip()


# REPLACE WITH:
# ----------------------------
# DOCX extraction
# ----------------------------
def extract_text_docx(docx_path: str) -> str:
    try:
        from docx import Document
    except ImportError as e:
        raise ImportError(
            "python-docx is not installed. Run:\npip install python-docx"
        ) from e
    doc = Document(docx_path)
    return "\n".join(p.text for p in doc.paragraphs).strip()


# ----------------------------
# OCR fallback (slower)
# ----------------------------
def _has_command(cmd: str) -> bool:
    return subprocess.call(
        ["bash", "-lc", f"command -v {cmd} >/dev/null 2>&1"]
    ) == 0


def extract_text_ocr(pdf_path: str, cfg: PdfExtractConfig) -> str:
    """
    OCR a PDF by converting pages to PNG (pdftoppm) then running tesseract via pytesseract.
    Requires:
      sudo apt install tesseract-ocr poppler-utils
      pip install pytesseract pillow
    """
    # Lazy import so fast-path users don't need these deps
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        raise ImportError(
            "OCR dependencies not installed. For OCR fallback, run:\n"
            "sudo apt install -y tesseract-ocr poppler-utils\n"
            "pip install pytesseract pillow"
        ) from e

    if not _has_command("pdftoppm"):
        raise RuntimeError(
            "pdftoppm not found. Install poppler-utils:\n"
            "sudo apt install -y poppler-utils"
        )

    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, "page")
        # Convert PDF -> PNG images
        subprocess.run(
            ["pdftoppm", "-png", "-f", "1", "-l", str(cfg.max_pages_for_ocr), pdf_path, prefix],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        texts: List[str] = []
        for fname in sorted(os.listdir(tmp)):
            if fname.endswith(".png"):
                img_path = os.path.join(tmp, fname)
                img = Image.open(img_path)
                texts.append(pytesseract.image_to_string(img))
        return "\n".join(texts).strip()


# ----------------------------
# Section focusing (experience, skills, projects, certs)
# ----------------------------
_HEADING_ALIASES: Dict[str, List[str]] = {
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "employment history",
        "career history",
        "work history",
    ],
    "projects": [
        "projects",
        "project experience",
        "personal projects",
        "academic projects",
    ],
    "skills": [
        "skills",
        "technical skills",
        "core skills",
        "tools",
        "technologies",
        "competencies",
    ],
    "certifications": [
        "certifications",
        "certificates",
        "licenses",
        "training",
    ],
    "education": [
        "education",
        "academic background",
    ],
}

# headings we typically do NOT need (your form already captures identity)
_IGNORE_HEADINGS = {
    "contact",
    "personal information",
    "personal details",
    "references",
    "reference",
    "objective",
    "summary",
    "profile",
}


def _normalize_heading(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[:\-–—]+$", "", s).strip()
    s = re.sub(r"[^a-z0-9 ]+", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _detect_heading(line: str) -> Optional[str]:
    """
    Return canonical section name if line looks like a heading.
    """
    raw = line.strip()
    if not raw:
        return None

    # Heuristics: headings are short and often Title Case / ALL CAPS / end with ':'
    looks_like_heading = (
        len(raw) <= 60
        and (raw.isupper() or raw.endswith(":") or raw.istitle())
    )

    if not looks_like_heading:
        return None

    norm = _normalize_heading(raw)
    if not norm:
        return None

    # ignore known non-useful headings
    if norm in _IGNORE_HEADINGS:
        return "__ignore__"

    # map to canonical sections
    for canonical, aliases in _HEADING_ALIASES.items():
        for a in aliases:
            if norm == a:
                return canonical

    return None


def extract_sections(text: str) -> Dict[str, str]:
    """
    Parse text into named sections using simple heading heuristics.
    Returns a dict: {section_name: section_text}
    """
    lines = text.splitlines()
    sections: Dict[str, List[str]] = {}
    current: Optional[str] = None

    for line in lines:
        h = _detect_heading(line)
        if h is not None:
            current = None if h == "__ignore__" else h
            if current and current not in sections:
                sections[current] = []
            continue

        if current:
            sections[current].append(line)

    # join and clean each section
    out: Dict[str, str] = {}
    for k, v in sections.items():
        chunk = clean_text("\n".join(v))
        if chunk:
            out[k] = chunk
    return out


def build_focus_text(
    sections: Dict[str, str],
    *,
    include_education: bool = True,
) -> str:
    """
    Combine relevant sections into a single focused text block for embeddings/matching.
    """
    order = ["experience", "projects", "skills", "certifications"]
    if include_education:
        order.append("education")

    parts: List[str] = []
    for key in order:
        if key in sections and sections[key].strip():
            parts.append(f"{key.upper()}\n{sections[key].strip()}")

    return "\n\n".join(parts).strip()


# ----------------------------
# Public API: extract everything you need
# ----------------------------
def extract_resume_text(
    pdf_path: str,
    cfg: Optional[PdfExtractConfig] = None,
) -> Dict[str, object]:
    ext = os.path.splitext(pdf_path)[-1].lower()

    if ext == ".txt":
        with open(pdf_path, "r", encoding="utf-8", errors="ignore") as f:
            full = clean_text(f.read())
        sections = extract_sections(full)
        focus    = build_focus_text(sections) or full
        return {"full_text": full, "focus_text": focus, "sections": sections, "method": "plaintext"}

    if ext == ".docx":
        full     = clean_text(extract_text_docx(pdf_path))
        sections = extract_sections(full)
        focus    = build_focus_text(sections) or full
        return {"full_text": full, "focus_text": focus, "sections": sections, "method": "docx"}
    """
    Extract resume text from a PDF with:
      - fast PyMuPDF extraction
      - optional OCR fallback for scanned PDFs
      - cleaning
      - section extraction + focused text

    Returns:
      {
        "full_text": str,
        "focus_text": str,
        "sections": { "experience": "...", ... },
        "method": "pymupdf" | "ocr"
      }
    """
    cfg = cfg or PdfExtractConfig()

    full = extract_text_pymupdf(pdf_path)
    method = "pymupdf"

    if cfg.enable_ocr and is_probably_scanned(full, cfg):
        # Try OCR fallback
        full_ocr = extract_text_ocr(pdf_path, cfg)
        if len(full_ocr.strip()) > len(full.strip()):
            full = full_ocr
            method = "ocr"

    full = clean_text(full)
    sections = extract_sections(full)
    focus = build_focus_text(sections)

    # Fallback: if focus is empty, use full text (still useful for embeddings)
    if not focus:
        focus = full

    return {
        "full_text": full,
        "focus_text": focus,
        "sections": sections,
        "method": method,
    }
