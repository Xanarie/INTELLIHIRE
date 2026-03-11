import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from typing import Optional

from app.firebase_client import get_db, doc_to_dict
from app.cloudinary_client import upload_resume
from app.schemas import UserResponse, ApplicantStatusUpdate

router = APIRouter(prefix="/api/applicants", tags=["Applicant Hub"])


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


def _has_description(job: dict) -> bool:
    return any(
        (job.get(f) or "").strip()
        for f in (
            "key_responsibilities",
            "required_qualifications",
            "preferred_qualifications",
            "key_competencies",
        )
    )


@router.get("/jobs")
def get_open_jobs():
    """Public endpoint — returns only Open jobs for the applicant portal dropdown."""
    db = get_db()
    docs = db.collection("jobs").where("status", "==", "Open").get()
    return [{"id": d.id, "title": d.to_dict().get("title", "")} for d in docs]


@router.post("/", response_model=UserResponse)
async def create_applicant(
    f_name: str = Form(...),
    l_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    age: int = Form(...),
    gender: str = Form(...),
    current_city: str = Form(...),
    current_province: str = Form(...),
    home_address: str = Form(...),
    education: str = Form(...),
    app_source: str = Form(...),
    stable_internet: str = Form(...),
    applied_position: str = Form(...),
    isp: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
):
    db = get_db()

    job_doc = None
    job_data = None
    jobs_q = db.collection("jobs").where("title", "==", applied_position).limit(1).get()
    if jobs_q:
        job_doc = jobs_q[0]
        job_data = doc_to_dict(job_doc)
        limit = int(job_data.get("applicant_limit", 50))
        count = len(db.collection("applicants").where("applied_position", "==", applied_position).get())
        if count >= limit:
            job_doc.reference.update({"status": "Closed"})
            raise HTTPException(status_code=400, detail="This position is no longer accepting applications")

    if resume and resume.filename:
            resume_bytes     = await resume.read()
            upload_result    = upload_resume(resume_bytes, resume.filename)
            resume_input_type = "file_upload"
    elif cover_letter and cover_letter.strip():
        resume_bytes     = cover_letter.encode("utf-8")
        upload_result    = upload_resume(resume_bytes, f"{f_name}_{l_name}_application.txt")
        resume_input_type = "manual_cv"
    else:
        raise HTTPException(status_code=400, detail="A resume file or application letter is required.")

    download_url = upload_result["download_url"]
    public_id = upload_result["public_id"]

    applicant_data = {
        "f_name": f_name,
        "l_name": l_name,
        "email": email,
        "phone": phone,
        "age": age,
        "gender": gender,
        "current_city": current_city,
        "current_province": current_province,
        "home_address": home_address,
        "education": education,
        "app_source": app_source,
        "stable_internet": stable_internet,
        "isp": isp,
        "applied_position": applied_position,
        "resume_path": download_url,
        "resume_storage_path": public_id,
        "hiring_status": "Pre-screening",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_prescreening_summary": None,
        "ai_match_json": None,
        "ai_resume_score": None,
        "ai_resume_bucket": None,
        "ai_resume_score_json": None,
        "ai_job_match_score": None,
        "ai_job_match_bucket": None,
        "ai_job_match_json": None,
        "ai_recommended_role": applied_position,
        "resume_input_type": resume_input_type,
        "resume_text": cover_letter.strip() if resume_input_type == "manual_cv" else None,
    }
    _, new_ref = db.collection("applicants").add(applicant_data)
    applicant_data["id"] = new_ref.id

    try:
        from app.ai.pdf_extract import extract_resume_text
        from app.ai.resume_score import score_resume_quality
        from app.ai.matching import score_applicant
        from app.ai.summarizer import summarize_prescreen
        import tempfile

        suffix = ".txt" if resume_input_type == "manual_cv" else (f".{resume.filename.rsplit('.', 1)[-1]}" if resume and resume.filename and "." in resume.filename else ".pdf")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(resume_bytes)
            tmp_path = tmp.name

        try:
            extracted = extract_resume_text(tmp_path)
            resume_focus_text = (extracted.get("focus_text") or "").strip()
        finally:
            os.unlink(tmp_path)

        if not resume_focus_text:
            return applicant_data

        ai_updates = {}

        try:
            rs = score_resume_quality(resume_focus_text)
            ai_updates["ai_resume_score"] = float(rs.get("score", 0.0))
            ai_updates["ai_resume_bucket"] = str(rs.get("bucket", "Weak"))
            ai_updates["ai_resume_score_json"] = rs
        except Exception as e:
            print(f"[AI] Resume score failed: {e}")

        open_jobs = db.collection("jobs").where("status", "==", "Open").get()
        scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_description(doc_to_dict(j))]

        def _score_job(jd):
            try:
                result = score_applicant(resume_focus_text, _job_full_text(jd))
                return jd["title"], result
            except Exception as e:
                print(f"[AI] Job score failed for '{jd.get('title')}': {e}")
                return jd["title"], None

        best_title = applied_position
        best_score = -1.0
        all_scores = {}
        applied_result = None

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
            ai_updates["ai_job_match_score"] = float(applied_result.get("score", 0.0))
            ai_updates["ai_job_match_bucket"] = str(applied_result.get("bucket", "Weak"))
            ai_updates["ai_job_match_json"] = applied_result

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
            if not applied_result:
                ai_updates["ai_match_json"] = summary_match
        except Exception as e:
            print(f"[AI] Prescreen summary failed: {e}")

        if ai_updates:
            new_ref.update(ai_updates)
            applicant_data.update(ai_updates)

    except Exception as e:
        print(f"[AI] Pipeline failed: {e}")

    return applicant_data


@router.patch("/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: str, payload: ApplicantStatusUpdate):
    db = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    ref.update({"hiring_status": payload.hiring_status})
    return doc_to_dict(ref.get())


@router.get("/jobs")
def get_public_jobs():
    db = get_db()
    docs = db.collection("jobs").where("status", "==", "Open").get()
    return [doc_to_dict(d) for d in docs]