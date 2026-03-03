import os
import tempfile
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.firebase_client import get_db, doc_to_dict
from app.cloudinary_client import delete_resume
from app.schemas import (
    UserResponse,
    UserUpdate,
    JobCreate,
    JobUpdate,
    JobResponse,
    EmployeeResponse,
    StatusUpdate,
    ApplicantStatusResponse,
)
from app.ai.pdf_extract  import extract_resume_text
from app.ai.resume_score import score_resume_quality
from app.ai.matching     import score_applicant
from app.ai.summarizer   import summarize_prescreen

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Shared helpers ────────────────────────────────────────────────────────────

def _has_desc(job: dict) -> bool:
    return any(
        (job.get(f) or "").strip()
        for f in ("key_responsibilities", "required_qualifications",
                  "preferred_qualifications", "key_competencies")
    )


def _job_full_text(job: dict) -> str:
    parts = []
    if job.get("key_responsibilities"):
        parts.append(f"Responsibilities:\n{job['key_responsibilities']}")
    if job.get("required_qualifications"):
        parts.append(f"Required Qualifications:\n{job['required_qualifications']}")
        parts.append(f"Must Have:\n{job['required_qualifications']}")
    if job.get("preferred_qualifications"):
        parts.append(f"Preferred Qualifications:\n{job['preferred_qualifications']}")
    if job.get("key_competencies"):
        parts.append(f"Key Competencies:\n{job['key_competencies']}")
    return "\n\n".join(parts)


def _download_resume_bytes(url: str, timeout: int = 30) -> bytes:
    """Download a resume from a URL and return raw bytes. Raises HTTPException on failure."""
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not download resume: {e}")


def _extract_focus_text(resume_bytes: bytes, suffix: str = ".pdf") -> str:
    """Write bytes to a temp file, extract focus text, clean up. Returns stripped text."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(resume_bytes)
        tmp_path = tmp.name
    try:
        extracted = extract_resume_text(tmp_path)
        return (extracted.get("focus_text") or "").strip()
    finally:
        os.unlink(tmp_path)


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICANTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/applicants")
def get_all_applicants():
    db   = get_db()
    docs = db.collection("applicants").order_by("created_at").get()
    return [doc_to_dict(d) for d in docs]


@router.get("/applicants/{applicant_id}", response_model=UserResponse)
def get_applicant(applicant_id: str):
    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return doc_to_dict(doc)


@router.put("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant(applicant_id: str, applicant_data: UserUpdate):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    payload = {k: v for k, v in applicant_data.model_dump(exclude_unset=True).items() if v is not None}
    ref.update(payload)
    return doc_to_dict(ref.get())


@router.patch("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: str, status_data: StatusUpdate):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    ref.update({"hiring_status": status_data.hiring_status})
    return doc_to_dict(ref.get())


@router.patch("/applicants/{applicant_id}/notes")
def save_recruiter_notes(applicant_id: str, payload: dict):
    """Save recruiter notes for a candidate."""
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    notes = payload.get("recruiter_notes", "")
    ref.update({"recruiter_notes": notes})
    return {"ok": True, "recruiter_notes": notes}


@router.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: str):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)

    if data.get("resume_storage_path"):
        delete_resume(data["resume_storage_path"])

    statuses = db.collection("applicant_statuses").where("applicant_id", "==", applicant_id).get()
    for s in statuses:
        s.reference.delete()

    ref.delete()
    return {"message": f"Applicant {applicant_id} deleted successfully"}


# ── Resume viewer ─────────────────────────────────────────────────────────────

@router.get("/applicants/{applicant_id}/resume")
def view_resume(applicant_id: str):
    """Proxies the resume from Cloudinary and serves it inline so the browser opens it in a new tab."""
    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=404, detail="No resume on file")

    resume_bytes = _download_resume_bytes(url)
    return Response(
        content=resume_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"},
    )


# ── Rerun Prescreen ───────────────────────────────────────────────────────────

@router.post("/applicants/{applicant_id}/prescreen", response_model=UserResponse)
def rerun_prescreen(applicant_id: str):
    """Re-runs the full AI pipeline for an existing applicant using their stored resume URL."""
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=404, detail="No resume on file")

    resume_bytes      = _download_resume_bytes(url)
    resume_focus_text = _extract_focus_text(resume_bytes)

    if not resume_focus_text:
        raise HTTPException(status_code=400, detail="Could not extract text from resume")

    ai_updates       = {}
    applied_position = data.get("applied_position", "")

    # Resume quality score
    try:
        rs = score_resume_quality(resume_focus_text)
        ai_updates["ai_resume_score"]      = float(rs.get("score", 0.0))
        ai_updates["ai_resume_bucket"]     = str(rs.get("bucket", "Weak"))
        ai_updates["ai_resume_score_json"] = rs
    except Exception as e:
        print(f"[Prescreen] Resume score failed: {e}")

    # Score against all open jobs in parallel
    open_jobs      = db.collection("jobs").where("status", "==", "Open").get()
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_desc(doc_to_dict(j))]
    best_title     = applied_position
    best_score     = -1.0
    all_scores     = {}
    applied_result = None

    def _score_job(jd):
        try:
            result = score_applicant(resume_focus_text, _job_full_text(jd))
            return jd["title"], result
        except Exception as e:
            print(f"[Prescreen] Job score failed for '{jd.get('title')}': {e}")
            return jd["title"], None

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_score_job, jd): jd for jd in scoreable_jobs}
        for future in as_completed(futures):
            title, result = future.result()
            if result is None:
                continue
            score = float(result.get("score", 0.0))
            all_scores[title] = result
            if score > best_score:
                best_score = score
                best_title = title
            if title == applied_position:
                applied_result = result

    if applied_result:
        ai_updates["ai_job_match_score"]  = float(applied_result.get("score", 0.0))
        ai_updates["ai_job_match_bucket"] = str(applied_result.get("bucket", "Weak"))
        ai_updates["ai_job_match_json"]   = applied_result

    ai_updates["ai_recommended_role"] = best_title

    try:
        summary_match = applied_result or (all_scores.get(best_title) if all_scores else None)
        prescreen = summarize_prescreen(
            resume_focus_text=resume_focus_text,
            job_title=applied_position,
            match_result=summary_match,
            suitable_role=best_title,
        )
        ai_updates["ai_prescreening_summary"] = prescreen.get("summary", "")
    except Exception as e:
        print(f"[Prescreen] Summary failed: {e}")

    ref.update(ai_updates)
    return doc_to_dict(ref.get())


# ── Role Suggestions ──────────────────────────────────────────────────────────

@router.get("/applicants/{applicant_id}/role-suggestions")
def get_role_suggestions(applicant_id: str):
    """Score an applicant against all open jobs and return ranked role suggestions."""
    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        return {"suggestions": []}

    resume_bytes      = _download_resume_bytes(url)
    resume_focus_text = _extract_focus_text(resume_bytes)
    if not resume_focus_text:
        return {"suggestions": []}

    open_jobs      = db.collection("jobs").where("status", "==", "Open").get()
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_desc(doc_to_dict(j))]
    applied        = data.get("applied_position", "")
    suggestions    = []

    def _score_job(jd):
        try:
            result = score_applicant(resume_focus_text, _job_full_text(jd))
            return jd, result
        except Exception as e:
            print(f"[RoleSuggestions] Failed for '{jd.get('title')}': {e}")
            return jd, None

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(_score_job, jd): jd for jd in scoreable_jobs}
        for future in as_completed(futures):
            jd, result = future.result()
            if result is None:
                continue
            suggestions.append({
                "job_id":              jd.get("id"),
                "title":               jd.get("title"),
                "score":               float(result.get("score", 0.0)),
                "bucket":              result.get("bucket", "Weak"),
                "is_applied_position": jd.get("title") == applied,
            })

    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return {"suggestions": suggestions}


# ═══════════════════════════════════════════════════════════════════════════════
# JOBS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs")
def get_all_jobs():
    db   = get_db()
    docs = db.collection("jobs").order_by("created_at").get()
    jobs = [doc_to_dict(d) for d in docs]

    open_jobs = [j for j in jobs if j.get("status") == "Open"]

    if open_jobs:
        applicant_docs = db.collection("applicants").select(["applied_position"]).get()

        position_counts: dict[str, int] = {}
        for a in applicant_docs:
            pos = (a.to_dict() or {}).get("applied_position", "")
            if pos:
                position_counts[pos] = position_counts.get(pos, 0) + 1

        batch             = db.batch()
        batch_has_updates = False

        for job in open_jobs:
            limit = int(job.get("applicant_limit", 50))
            count = position_counts.get(job.get("title", ""), 0)
            if count >= limit:
                ref = db.collection("jobs").document(job["id"])
                batch.update(ref, {"status": "Closed"})
                job["status"] = "Closed"
                batch_has_updates = True

        if batch_has_updates:
            batch.commit()

    return jobs


@router.post("/jobs")
def create_job(job_data: JobCreate):
    db      = get_db()
    payload = job_data.model_dump()
    payload["created_at"] = datetime.now(timezone.utc).isoformat()
    _, ref  = db.collection("jobs").add(payload)
    payload["id"] = ref.id
    return payload


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc_to_dict(doc)


@router.put("/jobs/{job_id}")
def update_job(job_id: str, job_data: JobCreate):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Job not found")
    payload = job_data.model_dump(exclude_unset=True)
    ref.update(payload)
    return doc_to_dict(ref.get())


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Job not found")
    ref.delete()
    return {"message": "Job deleted successfully"}


# ── Smart Screen ──────────────────────────────────────────────────────────────

@router.get("/smart-screen")
def smart_screen_rankings(title: str):
    """Score ALL applicants against a specific job by title and return ranked results."""
    db    = get_db()
    job_q = db.collection("jobs").where("title", "==", title).limit(1).get()
    if not job_q:
        raise HTTPException(status_code=404, detail="Job not found")

    job     = doc_to_dict(job_q[0])
    jd_text = _job_full_text(job)

    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job has no description to match against")

    all_applicants = [doc_to_dict(d) for d in db.collection("applicants").get()]
    results        = []

    def _score_applicant(a):
        url = a.get("resume_path")
        if not url:
            return None
        try:
            resume_bytes = _download_resume_bytes(url, timeout=20)
            text         = _extract_focus_text(resume_bytes)
            if not text:
                return None
            result = score_applicant(text, jd_text)
            return {
                **a,
                "role_match_score":  result.get("score", 0.0),
                "role_match_bucket": result.get("bucket", "Weak"),
                "role_match_json":   result,
            }
        except Exception as e:
            print(f"[SmartScreen] Failed for applicant {a.get('id')}: {e}")
            return None

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(_score_applicant, a) for a in all_applicants]
        for future in as_completed(futures):
            result = future.result()
            if result is not None:
                results.append(result)

    results.sort(key=lambda x: x.get("role_match_score", 0.0), reverse=True)
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# STATUS HISTORY
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/status/{applicant_id}", response_model=ApplicantStatusResponse)
def create_status(applicant_id: str, status_data: ApplicantStatusResponse):
    db = get_db()
    if not db.collection("applicants").document(applicant_id).get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    payload = {
        "applicant_id": applicant_id,
        "status":       status_data.status,
        "notes":        status_data.notes,
        "created_at":   datetime.now(timezone.utc).isoformat(),
    }
    _, ref = db.collection("applicant_statuses").add(payload)
    payload["id"] = ref.id
    return payload


@router.get("/status/{applicant_id}/latest")
def get_latest_status(applicant_id: str):
    db   = get_db()
    docs = (
        db.collection("applicant_statuses")
        .where("applicant_id", "==", applicant_id)
        .order_by("created_at")
        .get()
    )
    if not docs:
        return {"status": "Pre-screening", "applicant_id": applicant_id}
    return doc_to_dict(docs[-1])


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEES
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/employees")
def get_all_employees():
    db   = get_db()
    docs = db.collection("employees").get()
    return [doc_to_dict(d) for d in docs]


@router.post("/employees")
def create_employee(emp_data: dict):
    db      = get_db()
    payload = {
        "name":       emp_data.get("name", ""),
        "role":       emp_data.get("role", ""),
        "dept":       emp_data.get("dept", "General"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _, ref        = db.collection("employees").add(payload)
    payload["id"] = ref.id
    return payload


# ═══════════════════════════════════════════════════════════════════════════════
# ONBOARDING
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/onboarding")
def get_onboarding_applicants():
    db   = get_db()
    docs = db.collection("applicants").where("hiring_status", "==", "Onboarding").get()
    return [doc_to_dict(d) for d in docs]