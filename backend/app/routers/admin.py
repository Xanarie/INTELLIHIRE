import os
import tempfile
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Depends
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
from app.ai.matching     import score_applicant, set_match_config, MatchConfig
from app.ai.summarizer   import summarize_prescreen
from app.routers.logs    import write_log

from app import cache as _cache

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Shared helpers ────────────────────────────────────────────────────────────

def get_actor(x_actor_name: Optional[str] = Header(default=None)) -> str:
    """Reads X-Actor-Name header injected by the frontend axios interceptor."""
    return x_actor_name or "System"

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

def _applicant_name(data: dict) -> str:
    return f"{data.get('f_name', '')} {data.get('l_name', '')}".strip() or "Unknown"

def _build_match_config(adv: dict) -> MatchConfig:
    """Safely construct a MatchConfig from a dict, ignoring unknown keys."""
    valid = {k: v for k, v in adv.items() if k in MatchConfig.__dataclass_fields__}
    return MatchConfig(**valid)


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICANTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/applicants")
def get_all_applicants():
    cached = _cache.get("applicants")
    if cached is not None:
        return cached
    db     = get_db()
    docs   = db.collection("applicants").order_by("created_at").get()
    result = [doc_to_dict(d) for d in docs]
    _cache.set("applicants", result, ttl_seconds=30)
    return result

@router.get("/applicants/{applicant_id}", response_model=UserResponse)
def get_applicant(applicant_id: str):
    db  = get_db()
    doc = db.collection("applicants").document(applicant_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return doc_to_dict(doc)


@router.put("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant(applicant_id: str, applicant_data: UserUpdate, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    payload = {k: v for k, v in applicant_data.model_dump(exclude_unset=True).items() if v is not None}
    ref.update(payload)
    data = doc_to_dict(ref.get())
    _cache.invalidate("applicants")
    write_log(
        action="applicant_updated", entity_type="applicant",
        entity_id=applicant_id,   entity_name=_applicant_name(data),
        details=f"Profile updated. Fields: {', '.join(payload.keys())}",
        performed_by=actor,
    )
    return data


@router.patch("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: str, status_data: StatusUpdate, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    prev = doc_to_dict(doc).get("hiring_status", "—")
    ref.update({"hiring_status": status_data.hiring_status})
    data = doc_to_dict(ref.get())
    _cache.invalidate("applicants")
    write_log(
        action="status_changed", entity_type="applicant",
        entity_id=applicant_id,  entity_name=_applicant_name(data),
        details=f"Stage moved: '{prev}' → '{status_data.hiring_status}'",
        performed_by=actor,
    )
    return data


@router.patch("/applicants/{applicant_id}/notes")
def save_recruiter_notes(applicant_id: str, payload: dict, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    notes             = payload.get("recruiter_notes", "")
    endorsed_position = payload.get("endorsed_position", "")
    ref.update({"recruiter_notes": notes, "endorsed_position": endorsed_position})
    data = doc_to_dict(ref.get())
    _cache.invalidate("applicants")
    write_log(
        action="notes_updated", entity_type="applicant",
        entity_id=applicant_id, entity_name=_applicant_name(data),
        details="Recruiter notes updated.",
        performed_by=actor,
    )
    return {"ok": True, "recruiter_notes": notes}

@router.get("/match-config")
def get_match_config_endpoint():
    db  = get_db()
    doc = db.collection("config").document("match_config").get()
    if not doc.exists:
        return {}
    data = doc.to_dict()
    adv = data.get("advanced", {})
    set_match_config(_build_match_config(adv))
    return data


@router.post("/match-config")
def save_match_config_endpoint(payload: dict, actor: str = Depends(get_actor)):
    db = get_db()
    db.collection("config").document("match_config").set(payload)
    adv = payload.get("advanced", {})
    set_match_config(_build_match_config(adv))
    write_log(
        action="config_updated", entity_type="system",
        entity_id="match_config", entity_name="Match Scoring Config",
        details="Match scoring configuration updated.",
        performed_by=actor,
    )
    return {"ok": True}


@router.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: str, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    data = doc_to_dict(doc)
    name = _applicant_name(data)
    if data.get("resume_storage_path"):
        delete_resume(data["resume_storage_path"])
    for s in db.collection("applicant_statuses").where("applicant_id", "==", applicant_id).get():
        s.reference.delete()
    ref.delete()
    _cache.invalidate("applicants")
    write_log(
        action="applicant_deleted", entity_type="applicant",
        entity_id=applicant_id,    entity_name=name,
        details=f"'{name}' permanently deleted including resume and status history.",
        performed_by=actor,
    )
    return {"message": f"Applicant {applicant_id} deleted successfully"}


@router.get("/applicants/{applicant_id}/resume")
def view_resume(applicant_id: str, actor: str = Depends(get_actor)):
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
        entity_id=applicant_id, entity_name=_applicant_name(data),
        details="Resume opened.",
        performed_by=actor,
    )
    resume_bytes = _download_resume_bytes(url)
    return Response(
        content=resume_bytes, media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"},
    )


@router.post("/applicants/{applicant_id}/prescreen", response_model=UserResponse)
def rerun_prescreen(applicant_id: str, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    data = doc_to_dict(doc)
    name = _applicant_name(data)
    url  = data.get("resume_path")
    if not url:
        raise HTTPException(status_code=400, detail="No resume on file")

    resume_bytes = _download_resume_bytes(url)
    suffix = _get_resume_suffix(data)
    resume_focus_text = _extract_focus_text(resume_bytes, suffix=suffix)
    if not resume_focus_text:
        raise HTTPException(status_code=422, detail="Could not extract text from resume")

    updates = {}
    try:
        rs = score_resume_quality(resume_focus_text)
        updates["ai_resume_score"]      = float(rs.get("score", 0.0))
        updates["ai_resume_bucket"]     = str(rs.get("bucket", "Weak"))
        updates["ai_resume_score_json"] = rs
    except Exception as e:
        print(f"[Prescreen] Resume score failed: {e}")

    open_jobs      = db.collection("jobs").where("status", "==", "Open").get()
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_desc(doc_to_dict(j))]

    def _score_job(jd):
        try:
            result = score_applicant(resume_focus_text, _job_full_text(jd))
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
        applied = data.get("applied_position", "")
        applied_match = job_scores.get(applied)
        best = max(job_scores, key=lambda t: job_scores[t].get("score", 0.0)) if job_scores else applied
        prescreen = summarize_prescreen(
            resume_focus_text=resume_focus_text,
            job_title=applied,
            match_result=applied_match,
            suitable_role=best,
        )
        updates["ai_prescreening_summary"] = prescreen.get("summary", "")
    except Exception as e:
        print(f"[Prescreen] Summarizer failed: {e}")
    if updates:
        ref.update(updates)

    write_log(
        action="prescreen_rerun", entity_type="applicant",
        entity_id=applicant_id,  entity_name=name,
        details=f"AI prescreen re-run. Resume score: {updates.get('ai_resume_score', '—')}, "
                f"Job match: {updates.get('ai_job_match_score', '—')}.",
        performed_by=actor,
    )
    return doc_to_dict(ref.get())


@router.get("/applicants/{applicant_id}/role-suggestions")
def get_role_suggestions(applicant_id: str):
    cached_list = _cache.get("applicants")
    data = next((a for a in (cached_list or []) if a.get("id") == applicant_id), None)

    if data is None:
        db  = get_db()
        doc = db.collection("applicants").document(applicant_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Applicant not found")
        data = doc_to_dict(doc)

    url = data.get("resume_path")
    if not url:
        return {"suggestions": []}

    resume_bytes      = _download_resume_bytes(url)
    suffix = _get_resume_suffix(data)
    resume_focus_text = _extract_focus_text(resume_bytes, suffix=suffix)
    if not resume_focus_text:
        return {"suggestions": []}

    db             = get_db()
    open_jobs      = db.collection("jobs").where("status", "==", "Open").get()
    scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_desc(doc_to_dict(j))]

    def _score(jd):
        try:
            result = score_applicant(resume_focus_text, _job_full_text(jd))
            return {
                "job_id":              jd.get("id", ""),
                "title":               jd.get("title", ""),
                "department":          jd.get("department", ""),
                "score":               result.get("score", 0.0),
                "bucket":              result.get("bucket", "Weak"),
                "knockout":            result.get("knockout", False),
                "is_applied_position": jd.get("title") == data.get("applied_position"),
            }
        except Exception as e:
            print(f"[RoleSuggestions] Failed for {jd.get('title')}: {e}")
            return None

    suggestions = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for future in as_completed([pool.submit(_score, jd) for jd in scoreable_jobs]):
            r = future.result()
            if r:
                suggestions.append(r)

    suggestions.sort(key=lambda x: x["score"], reverse=True)
    return {"suggestions": suggestions}

@router.patch("/applicants/{applicant_id}/onboarding-checklist")
def save_onboarding_checklist(applicant_id: str, payload: dict):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    ref.update({"onboarding_checklist": payload.get("onboarding_checklist", {})})
    return {"ok": True}

# ═══════════════════════════════════════════════════════════════════════════════
# SMART SCREEN
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/smart-screen")
def smart_screen(title: str):
    db    = get_db()
    job_q = db.collection("jobs").where("title", "==", title).limit(1).get()
    if not job_q:
        raise HTTPException(status_code=404, detail="Job not found")
    job     = doc_to_dict(job_q[0])
    jd_text = _job_full_text(job)
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
    _cache.invalidate("jobs")
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
    cached = _cache.get("jobs")
    if cached is not None:
        return cached
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
def create_job(job_data: JobCreate, actor: str = Depends(get_actor)):
    db = get_db()
    payload = {**job_data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    _, ref        = db.collection("jobs").add(payload)
    payload["id"] = ref.id
    _cache.invalidate("jobs")
    write_log(
        action="job_created", entity_type="job",
        entity_id=ref.id,    entity_name=job_data.title,
        details=f"Job '{job_data.title}' created in {job_data.department or '—'}, status '{job_data.status}'.",
        performed_by=actor,
    )
    return payload


@router.put("/jobs/{job_id}", response_model=JobResponse)
def update_job(job_id: str, job_data: JobUpdate, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Job not found")
    payload = {k: v for k, v in job_data.model_dump(exclude_unset=True).items() if v is not None}
    ref.update(payload)
    updated = doc_to_dict(ref.get())
    _cache.invalidate("jobs")
    write_log(
        action="job_updated", entity_type="job",
        entity_id=job_id,    entity_name=updated.get("title", job_id),
        details=f"Job updated. Fields: {', '.join(payload.keys())}",
        performed_by=actor,
    )
    return updated


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, actor: str = Depends(get_actor)):
    db  = get_db()
    ref = db.collection("jobs").document(job_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")
    title = doc_to_dict(doc).get("title", job_id)
    ref.delete()
    _cache.invalidate("jobs")
    write_log(
        action="job_deleted", entity_type="job",
        entity_id=job_id,    entity_name=title,
        details=f"Job posting '{title}' permanently deleted.",
        performed_by=actor,
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
def create_employee(emp_data: dict, actor: str = Depends(get_actor)):
    import firebase_admin.auth as fb_auth

    name            = emp_data.get("name", "")
    email           = emp_data.get("email", "")
    password        = emp_data.get("password", "")
    permission_rule = emp_data.get("permission_role", "Recruiter")

    try:
        user_record = fb_auth.create_user(email=email, password=password, display_name=name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create auth account: {str(e)}")

    db = get_db()
    payload = {
        "name":            name,
        "email":           email,
        "permission_rule": permission_rule,
        "uid":             user_record.uid,
        "created_at":      datetime.now(timezone.utc).isoformat(),
    }
    _, ref        = db.collection("employees").add(payload)
    payload["id"] = ref.id
    write_log(
        action="employee_added", entity_type="employee",
        entity_id=ref.id,       entity_name=name,
        details=f"Employee '{name}' added as {permission_rule}.",
        performed_by=actor,
    )
    return payload

@router.delete("/employees/{employee_id}")
def delete_employee(employee_id: str, actor: str = Depends(get_actor)):
    import firebase_admin.auth as fb_auth

    db  = get_db()
    ref = db.collection("employees").document(employee_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Employee not found")
    data = doc_to_dict(doc)
    name = data.get("name", employee_id)
    uid  = data.get("uid")

    if uid:
        try:
            fb_auth.delete_user(uid)
        except Exception as e:
            print(f"[employees] Auth delete failed for uid {uid}: {e}")

    ref.delete()
    _cache.invalidate("employees")
    write_log(
        action="employee_deleted", entity_type="employee",
        entity_id=employee_id,    entity_name=name,
        details=f"Employee '{name}' removed.",
        performed_by=actor,
    )
    return {"ok": True, "message": f"Employee {employee_id} deleted"}


# ═══════════════════════════════════════════════════════════════════════════════
# ONBOARDING
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/onboarding")
def get_onboarding_applicants():
    db   = get_db()
    docs = db.collection("applicants").where("hiring_status", "==", "Onboarding").get()
    return [doc_to_dict(d) for d in docs]