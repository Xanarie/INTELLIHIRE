import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

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

router = APIRouter(prefix="/api/admin", tags=["Admin"])


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

    # Delete resume from Firebase Storage
    if data.get("resume_storage_path"):
        delete_resume(data["resume_storage_path"])

    # Delete related status documents
    statuses = db.collection("applicant_statuses").where("applicant_id", "==", applicant_id).get()
    for s in statuses:
        s.reference.delete()

    ref.delete()
    return {"message": f"Applicant {applicant_id} deleted successfully"}


# ── Resume viewer ─────────────────────────────────────────────────────────────

@router.get("/applicants/{applicant_id}/resume")
def view_resume(applicant_id: str):
    """Proxies the resume from Cloudinary and serves it inline so the browser opens it in a new tab."""
    import requests as req_lib
    from fastapi.responses import Response

    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=404, detail="No resume on file")

    try:
        r = req_lib.get(url, timeout=30)
        r.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch resume: {e}")

    return Response(
        content=r.content,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"},
    )


# ── Rerun Prescreen ───────────────────────────────────────────────────────────

@router.post("/applicants/{applicant_id}/prescreen", response_model=UserResponse)
def rerun_prescreen(applicant_id: str):
    """Re-runs the full AI pipeline for an existing applicant using their stored resume URL."""
    from app.ai.pdf_extract  import extract_resume_text
    from app.ai.resume_score import score_resume_quality
    from app.ai.matching     import score_applicant
    from app.ai.summarizer   import summarize_prescreen
    import tempfile, requests

    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=404, detail="No resume on file")

    # Download resume bytes from Firebase Storage URL
    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        resume_bytes = r.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not download resume: {e}")

    # Write to temp file for extractors
    ext = "pdf"  # Cloudinary public_id has no extension; PDFs are the default
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(resume_bytes)
        tmp_path = tmp.name

    try:
        extracted         = extract_resume_text(tmp_path)
        resume_focus_text = (extracted.get("focus_text") or "").strip()
    finally:
        os.unlink(tmp_path)

    if not resume_focus_text:
        raise HTTPException(status_code=400, detail="Could not extract text from resume")

    ai_updates = {}

    # Resume quality
    try:
        rs = score_resume_quality(resume_focus_text)
        ai_updates["ai_resume_score"]      = float(rs.get("score", 0.0))
        ai_updates["ai_resume_bucket"]     = str(rs.get("bucket", "Weak"))
        ai_updates["ai_resume_score_json"] = rs
    except Exception as e:
        print(f"[Prescreen] Resume score failed: {e}")

    # ── Match against applied position + ALL open jobs in parallel ─────────
    from concurrent.futures import ThreadPoolExecutor, as_completed as _as_completed

    applied_position = data.get("applied_position", "")
    open_jobs = db.collection("jobs").where("status", "==", "Open").get()
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_description(doc_to_dict(j))]

    def _score_job(jd):
        try:
            result = score_applicant(resume_focus_text, _job_full_text(jd))
            return jd["title"], result
        except Exception as e:
            print(f"[Prescreen] Job score failed for '{jd.get('title')}': {e}")
            return jd["title"], None

    best_title   = applied_position
    best_score   = -1.0
    applied_result = None

    if scoreable_jobs:
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = [pool.submit(_score_job, jd) for jd in scoreable_jobs]
            for future in _as_completed(futures):
                title, result = future.result()
                if result is None:
                    continue
                sc = float(result.get("score", 0.0))
                if title == applied_position:
                    applied_result = result
                if sc > best_score:
                    best_score = sc
                    best_title = title

    if applied_result:
        ai_updates["ai_job_match_score"]  = float(applied_result.get("score", 0.0))
        ai_updates["ai_job_match_bucket"] = str(applied_result.get("bucket", "Needs Review"))
        ai_updates["ai_job_match_json"]   = applied_result
        ai_updates["ai_match_json"]       = applied_result

    ai_updates["ai_recommended_role"] = best_title

    summary_input = applied_result or {
        "score":      ai_updates.get("ai_resume_score", 0.0),
        "bucket":     ai_updates.get("ai_resume_bucket", "Weak"),
        "knockout":   False, "breakdown": {},
        "must_haves": {"matched": [], "missing": []}, "mode": "resume_only",
    }
    try:
        prescreen = summarize_prescreen(
            resume_focus_text=resume_focus_text,
            job_title=applied_position,
            match_result=summary_input,
            suitable_role=best_title,   # ← AI-chosen best role
        )
        ai_updates["ai_prescreening_summary"] = prescreen.get("summary", "")
        if not applied_result:
            ai_updates["ai_match_json"] = summary_input
    except Exception as e:
        print(f"[Prescreen] Summary failed: {e}")

    if ai_updates:
        ref.update(ai_updates)

    return doc_to_dict(ref.get())


# ── Role suggestions ──────────────────────────────────────────────────────────

@router.get("/applicants/{applicant_id}/role-suggestions")
def get_role_suggestions(applicant_id: str):
    from app.ai.pdf_extract import extract_resume_text
    from app.ai.matching    import score_applicant
    import tempfile, requests

    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")

    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=404, detail="No resume on file")

    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        resume_bytes = r.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not download resume: {e}")

    ext = "pdf"  # Cloudinary public_id has no extension; PDFs are the default
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(resume_bytes)
        tmp_path = tmp.name

    try:
        extracted         = extract_resume_text(tmp_path)
        resume_focus_text = (extracted.get("focus_text") or "").strip()
    finally:
        os.unlink(tmp_path)

    if not resume_focus_text:
        raise HTTPException(status_code=400, detail="Could not extract resume text")

    open_jobs = db.collection("jobs").where("status", "==", "Open").get()
    suggestions = []
    for jdoc in open_jobs:
        jd = doc_to_dict(jdoc)
        if not _has_description(jd):
            continue
        try:
            result = score_applicant(resume_focus_text, _job_full_text(jd))
            suggestions.append({
                "job_id":   jd["id"],
                "title":    jd.get("title", ""),
                "score":    result.get("score", 0),
                "bucket":   result.get("bucket", ""),
                "knockout": result.get("knockout", False),
            })
        except Exception:
            pass

    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return {"suggestions": suggestions}


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICANT STATUSES
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
# JOBS
# ═══════════════════════════════════════════════════════════════════════════════

def _has_description(job: dict) -> bool:
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


@router.get("/smart-screen")
def smart_screen_rankings(title: str):
    """Score ALL applicants against a specific job by title and return ranked results."""
    from app.ai.matching    import score_applicant
    from app.ai.pdf_extract import extract_resume_text
    from concurrent.futures import ThreadPoolExecutor, as_completed as _as_completed
    import tempfile, requests

    db = get_db()

    # Find the job by title
    job_docs = db.collection("jobs").where("title", "==", title).limit(1).get()
    if not job_docs:
        raise HTTPException(status_code=404, detail=f"Job '{title}' not found")
    job = doc_to_dict(job_docs[0])

    if not _has_description(job):
        raise HTTPException(status_code=422, detail="Job has no description to score against")

    job_text = _job_full_text(job)

    # Get all applicants
    applicants = [doc_to_dict(d) for d in db.collection("applicants").get()]

    def _score_one(app):
        """Download resume, extract text, score against the job. Returns (id, score, bucket) or None."""
        url = app.get("resume_path") or app.get("resume_url")
        if not url:
            return None
        try:
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(r.content)
                tmp_path = tmp.name
            try:
                extracted = extract_resume_text(tmp_path)
                focus_text = (extracted.get("focus_text") or "").strip()
            finally:
                os.unlink(tmp_path)
            if not focus_text:
                return None
            result = score_applicant(focus_text, job_text)
            return {
                "id":         app.get("id"),
                "f_name":     app.get("f_name", ""),
                "l_name":     app.get("l_name", ""),
                "email":      app.get("email", ""),
                "applied_position": app.get("applied_position", ""),
                "hiring_status":    app.get("hiring_status", ""),
                "ai_recommended_role": app.get("ai_recommended_role"),
                "role_match_score":  float(result.get("score", 0)),
                "role_match_bucket": str(result.get("bucket", "Needs Review")),
            }
        except Exception as e:
            print(f"[SmartScreen] Failed for {app.get('id')}: {e}")
            return None

    results = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(_score_one, app) for app in applicants]
        for future in _as_completed(futures):
            res = future.result()
            if res:
                results.append(res)

    results.sort(key=lambda x: x["role_match_score"], reverse=True)
    return results[:10]


@router.get("/jobs")
def get_all_jobs():
    db   = get_db()
    docs = db.collection("jobs").order_by("created_at").get()
    jobs = [doc_to_dict(d) for d in docs]

    # Auto-close jobs that hit their applicant limit
    applicants_all = db.collection("applicants").get()
    position_counts: dict[str, int] = {}
    for a in applicants_all:
        pos = (a.to_dict() or {}).get("applied_position", "")
        if pos:
            position_counts[pos] = position_counts.get(pos, 0) + 1

    for job in jobs:
        limit = int(job.get("applicant_limit", 50))
        count = position_counts.get(job.get("title", ""), 0)
        if count >= limit and job.get("status") == "Open":
            db.collection("jobs").document(job["id"]).update({"status": "Closed"})
            job["status"] = "Closed"

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
    _, ref  = db.collection("employees").add(payload)
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