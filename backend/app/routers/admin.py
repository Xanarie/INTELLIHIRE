# backend/app/routers/admin.py
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
    UserResponse, UserUpdate,
    JobCreate, JobUpdate, JobResponse,
    EmployeeResponse,
    StatusUpdate, ApplicantStatusResponse,
)
from app.ai.pdf_extract  import extract_resume_text
from app.ai.resume_score import score_resume_quality
from app.ai.matching     import score_applicant
from app.ai.summarizer   import summarize_prescreen
from app.routers.logs    import write_log
from app.utils import job_full_text, has_job_description, applicant_full_name

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Shared helpers ────────────────────────────────────────────────────────────

def _download_resume_bytes(url: str, timeout: int = 30) -> bytes:
    try:
        r = requests.get(url, timeout=timeout)
        r.raise_for_status()
        return r.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not download resume: {e}")

def _extract_focus_text(resume_bytes: bytes, suffix: str = ".pdf") -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(resume_bytes)
        tmp_path = tmp.name
    try:
        extracted = extract_resume_text(tmp_path)
        return (extracted.get("focus_text") or "").strip()
    finally:
        os.unlink(tmp_path)

def _validate_resume_file(filename: str) -> bool:
    """Validate resume file type."""
    allowed_extensions = {'.pdf', '.doc', '.docx'}
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed_extensions


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
    data = doc_to_dict(ref.get())
    write_log(
        action="applicant_updated", entity_type="applicant",
        entity_id=applicant_id,   entity_name=applicant_full_name(data),
        details=f"Profile updated. Fields: {', '.join(payload.keys())}",
    )
    return data


@router.patch("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: str, status_data: StatusUpdate):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    prev = doc_to_dict(doc).get("hiring_status", "—")
    ref.update({"hiring_status": status_data.hiring_status})
    data = doc_to_dict(ref.get())
    write_log(
        action="status_changed", entity_type="applicant",
        entity_id=applicant_id,  entity_name=applicant_full_name(data),
        details=f"Stage moved: '{prev}' → '{status_data.hiring_status}'",
    )
    return data


@router.patch("/applicants/{applicant_id}/notes")
def save_recruiter_notes(applicant_id: str, payload: dict):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    notes = payload.get("recruiter_notes", "")
    ref.update({"recruiter_notes": notes})
    data = doc_to_dict(ref.get())
    write_log(
        action="notes_updated", entity_type="applicant",
        entity_id=applicant_id, entity_name=applicant_full_name(data),
        details="Recruiter notes updated.",
    )
    return {"ok": True, "recruiter_notes": notes}


@router.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: str):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    data = doc_to_dict(doc)
    name = applicant_full_name(data)
    if data.get("resume_storage_path"):
        delete_resume(data["resume_storage_path"])
    for s in db.collection("applicant_statuses").where("applicant_id", "==", applicant_id).get():
        s.reference.delete()
    ref.delete()
    write_log(
        action="applicant_deleted", entity_type="applicant",
        entity_id=applicant_id,    entity_name=name,
        details=f"'{name}' permanently deleted including resume and status history.",
    )
    return {"message": f"Applicant {applicant_id} deleted successfully"}


@router.get("/applicants/{applicant_id}/resume")
def view_resume(applicant_id: str):
    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    data = doc_to_dict(doc)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=404, detail="No resume on file")
    write_log(
        action="resume_viewed", entity_type="applicant",
        entity_id=applicant_id, entity_name=applicant_full_name(data),
        details="Resume opened.",
    )
    resume_bytes = _download_resume_bytes(url)
    return Response(
        content=resume_bytes, media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"},
    )


@router.post("/applicants/{applicant_id}/prescreen", response_model=UserResponse)
def rerun_prescreen(applicant_id: str):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    data = doc_to_dict(doc)
    name = applicant_full_name(data)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=400, detail="No resume on file")

    try:
        resume_bytes = _download_resume_bytes(url)
        resume_focus_text = _extract_focus_text(resume_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(e)}")
    
    if not resume_focus_text:
        raise HTTPException(status_code=422, detail="Could not extract text from resume")

    updates = {}
    # Store the extracted resume text for future use (e.g., chat)
    updates["resume_focus_text"] = resume_focus_text
    
    try:
        rs = score_resume_quality(resume_focus_text)
        updates["ai_resume_score"]      = float(rs.get("score", 0.0))
        updates["ai_resume_bucket"]     = str(rs.get("bucket", "Weak"))
        updates["ai_resume_score_json"] = rs
    except Exception as e:
        print(f"[Prescreen] Resume score failed: {e}")

    open_jobs      = db.collection("jobs").where("status", "==", "Open").get()
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if has_job_description(doc_to_dict(j))]

    def _score_job(jd):
        try:
            result = score_applicant(resume_focus_text, job_full_text(jd))
            return jd["title"], result
        except Exception as e:
            print(f"[Prescreen] Job match failed for {jd.get('title')}: {e}")
            return None

    job_scores = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        for future in as_completed([pool.submit(_score_job, jd) for jd in scoreable_jobs]):
            r = future.result()
            if r:
                job_scores[r[0]] = r[1]

    applied = data.get("applied_position", "")
    if applied in job_scores:
        ms = job_scores[applied]
        updates["ai_job_match_score"]  = float(ms.get("score", 0.0))
        updates["ai_job_match_bucket"] = str(ms.get("bucket", "Weak"))
        updates["ai_job_match_json"]   = ms

    if job_scores:
        best = max(job_scores, key=lambda t: job_scores[t].get("score", 0.0))
        updates["ai_recommended_role"] = best

    try:
        # Get the match result for the applied position if available
        applied = data.get("applied_position", "")
        match_result = job_scores.get(applied) if applied in job_scores else None
        suitable_role = updates.get("ai_recommended_role")
        
        updates["ai_prescreening_summary"] = summarize_prescreen(
            resume_focus_text=resume_focus_text,
            job_title=applied or None,
            match_result=match_result,
            suitable_role=suitable_role,
        )
    except Exception as e:
        print(f"[Prescreen] Summarizer failed: {e}")

    if updates:
        ref.update(updates)

    write_log(
        action="prescreen_rerun", entity_type="applicant",
        entity_id=applicant_id,  entity_name=name,
        details=f"AI prescreen re-run. Resume score: {updates.get('ai_resume_score', '—')}, "
                f"Job match: {updates.get('ai_job_match_score', '—')}.",
    )
    return doc_to_dict(ref.get())


@router.get("/applicants/{applicant_id}/role-suggestions")
def get_role_suggestions(applicant_id: str):
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
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if has_job_description(doc_to_dict(j))]
    if not scoreable_jobs:
        return {"suggestions": []}

    def _score(jd):
        try:
            result = score_applicant(resume_focus_text, job_full_text(jd))
            return {
                "job_id": jd["id"], "title": jd["title"],
                "department": jd.get("department", ""),
                "score": result.get("score", 0.0),
                "bucket": result.get("bucket", "Weak"),
                "knockout": result.get("knockout", False),
                "is_applied_position": jd["title"] == data.get("applied_position"),
            }
        except Exception as e:
            print(f"[Suggestions] Failed for {jd.get('title')}: {e}")
            return None

    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for future in as_completed([pool.submit(_score, jd) for jd in scoreable_jobs]):
            r = future.result()
            if r:
                results.append(r)
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"suggestions": results}


@router.get("/smart-screen")
def smart_screen(title: str):
    db    = get_db()
    job_q = db.collection("jobs").where("title", "==", title).limit(1).get()
    if not job_q:
        raise HTTPException(status_code=404, detail="Job not found")
    job     = doc_to_dict(job_q[0])
    jd_text = job_full_text(job)
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job has no description")
    all_applicants = [doc_to_dict(d) for d in db.collection("applicants").get()]

    def _score_applicant(a):
        url = a.get("resume_path")
        if not url:
            return None
        try:
            text   = _extract_focus_text(_download_resume_bytes(url, timeout=20))
            result = score_applicant(text, jd_text)
            return {**a, "role_match_score": result.get("score", 0.0),
                    "role_match_bucket": result.get("bucket", "Weak"), "role_match_json": result}
        except Exception as e:
            print(f"[SmartScreen] Failed for {a.get('id')}: {e}")
            return None

    results = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for future in as_completed([pool.submit(_score_applicant, a) for a in all_applicants]):
            r = future.result()
            if r:
                results.append(r)
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
        "applicant_id": applicant_id, "status": status_data.status,
        "notes": status_data.notes, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _, ref = db.collection("applicant_statuses").add(payload)
    payload["id"] = ref.id
    return payload


@router.get("/status/{applicant_id}/latest")
def get_latest_status(applicant_id: str):
    db   = get_db()
    docs = (db.collection("applicant_statuses")
              .where("applicant_id", "==", applicant_id)
              .order_by("created_at").get())
    if not docs:
        return {"status": "Pre-screening", "applicant_id": applicant_id}
    return doc_to_dict(docs[-1])


# ═══════════════════════════════════════════════════════════════════════════════
# JOBS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/jobs")
def get_all_jobs():
    db   = get_db()
    docs = db.collection("jobs").order_by("created_at").get()
    return [doc_to_dict(d) for d in docs]


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str):
    db  = get_db()
    doc = db.collection("jobs").document(job_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc_to_dict(doc)


@router.post("/jobs", response_model=JobResponse)
def create_job(job_data: JobCreate):
    db = get_db()
    payload = {**job_data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    _, ref        = db.collection("jobs").add(payload)
    payload["id"] = ref.id
    write_log(
        action="job_created", entity_type="job",
        entity_id=ref.id,    entity_name=job_data.title,
        details=f"Job '{job_data.title}' created in {job_data.department or '—'}, status '{job_data.status}'.",
    )
    return payload


@router.put("/jobs/{job_id}", response_model=JobResponse)
def update_job(job_id: str, job_data: JobUpdate):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Job not found")
    payload = {k: v for k, v in job_data.model_dump(exclude_unset=True).items() if v is not None}
    ref.update(payload)
    updated = doc_to_dict(ref.get())
    write_log(
        action="job_updated", entity_type="job",
        entity_id=job_id,    entity_name=updated.get("title", job_id),
        details=f"Job updated. Fields: {', '.join(payload.keys())}",
    )
    return updated


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    title = doc_to_dict(doc).get("title", job_id)
    ref.delete()
    write_log(
        action="job_deleted", entity_type="job",
        entity_id=job_id,    entity_name=title,
        details=f"Job posting '{title}' permanently deleted.",
    )
    return {"message": f"Job {job_id} deleted successfully"}


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
    db = get_db()
    payload = {
        "name": emp_data.get("name", ""), "role": emp_data.get("role", ""),
        "dept": emp_data.get("dept", "General"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _, ref        = db.collection("employees").add(payload)
    payload["id"] = ref.id
    write_log(
        action="employee_added", entity_type="employee",
        entity_id=ref.id,       entity_name=payload["name"],
        details=f"Employee '{payload['name']}' added as {payload['role']}.",
    )
    return payload


# ═══════════════════════════════════════════════════════════════════════════════
# ONBOARDING
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/onboarding")
def get_onboarding_applicants():
    db   = get_db()
    docs = db.collection("applicants").where("hiring_status", "==", "Onboarding").get()
    return [doc_to_dict(d) for d in docs]