import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from typing import Optional

from app.firebase_client import get_db, doc_to_dict
from app.cloudinary_client import upload_resume
from app.schemas import UserResponse, ApplicantStatusUpdate
from app.utils import job_full_text, has_job_description

router = APIRouter(prefix="/api/applicants", tags=["Applicant Hub"])


ALLOWED_RESUME_EXTENSIONS = {'.pdf', '.doc', '.docx'}

def _validate_resume_file(filename: str) -> bool:
    """Validate resume file type."""
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_RESUME_EXTENSIONS


@router.post("/", response_model=UserResponse)
async def create_applicant(
    f_name:           str = Form(...),
    l_name:           str = Form(...),
    email:            str = Form(...),
    phone:            str = Form(...),
    age:              int = Form(...),
    gender:           str = Form(...),
    current_city:     str = Form(...),
    current_province: str = Form(...),
    home_address:     str = Form(...),
    education:        str = Form(...),
    app_source:       str = Form(...),
    stable_internet:  str = Form(...),
    applied_position: str = Form(...),
    isp:              Optional[str] = Form(None),
    resume:           UploadFile = File(...),
):
    db = get_db()

    # 1. Validate resume file type
    if not _validate_resume_file(resume.filename):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_RESUME_EXTENSIONS)}"
        )

    # 2. Duplicate email check
    if db.collection("applicants").where("email", "==", email).limit(1).get():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Job limit check
    job_doc  = None
    job_data = None
    jobs_q   = db.collection("jobs").where("title", "==", applied_position).limit(1).get()
    if jobs_q:
        job_doc  = jobs_q[0]
        job_data = doc_to_dict(job_doc)
        limit    = int(job_data.get("applicant_limit", 50))
        count    = len(db.collection("applicants").where("applied_position", "==", applied_position).get())
        if count >= limit:
            job_doc.reference.update({"status": "Closed"})
            raise HTTPException(status_code=400, detail="This position is no longer accepting applications")

    # 4. Upload resume to Cloudinary
    try:
        resume_bytes  = await resume.read()
        upload_result = upload_resume(resume_bytes, resume.filename)
        download_url  = upload_result["download_url"]
        public_id     = upload_result["public_id"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")

    # 5. Save initial Firestore document
    applicant_data = {
        "f_name": f_name, "l_name": l_name, "email": email, "phone": phone,
        "age": age, "gender": gender, "current_city": current_city,
        "current_province": current_province, "home_address": home_address,
        "education": education, "app_source": app_source,
        "stable_internet": stable_internet, "isp": isp,
        "applied_position": applied_position,
        "resume_path": download_url,
        "resume_storage_path": public_id,
        "hiring_status": "Pre-screening",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_prescreening_summary": None, "ai_match_json": None,
        "ai_resume_score": None, "ai_resume_bucket": None, "ai_resume_score_json": None,
        "ai_job_match_score": None, "ai_job_match_bucket": None, "ai_job_match_json": None,
        "ai_recommended_role": applied_position,
    }
    _, new_ref = db.collection("applicants").add(applicant_data)
    applicant_data["id"] = new_ref.id
    
    # Store resume text for future use
    applicant_data["resume_focus_text"] = None

    # 6. AI pipeline (best-effort, never blocks response)
    try:
        from app.ai.pdf_extract  import extract_resume_text
        from app.ai.resume_score import score_resume_quality
        from app.ai.matching     import score_applicant
        from app.ai.summarizer   import summarize_prescreen
        import tempfile

        suffix = f".{resume.filename.rsplit('.', 1)[-1]}" if "." in resume.filename else ".pdf"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(resume_bytes)
            tmp_path = tmp.name

        try:
            extracted         = extract_resume_text(tmp_path)
            resume_focus_text = (extracted.get("focus_text") or "").strip()
        finally:
            os.unlink(tmp_path)

        if not resume_focus_text:
            print("[AI] Could not extract resume text, skipping AI pipeline")
            return applicant_data

        ai_updates = {"resume_focus_text": resume_focus_text}

        # Resume quality score
        try:
            rs = score_resume_quality(resume_focus_text)
            ai_updates["ai_resume_score"]      = float(rs.get("score", 0.0))
            ai_updates["ai_resume_bucket"]     = str(rs.get("bucket", "Weak"))
            ai_updates["ai_resume_score_json"] = rs
        except Exception as e:
            print(f"[AI] Resume score failed: {e}")

        # Match against applied position + all open jobs in parallel
        open_jobs     = db.collection("jobs").where("status", "==", "Open").get()
        scoreable_jobs = [doc_to_dict(j) for j in open_jobs if has_job_description(doc_to_dict(j))]

        def _score_job(jd):
            try:
                result = score_applicant(resume_focus_text, job_full_text(jd))
                return jd["title"], result
            except Exception as e:
                print(f"[AI] Job score failed for '{jd.get('title')}': {e}")
                return jd["title"], None

        best_title  = applied_position
        best_score  = -1.0
        all_scores  = {}
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
            ai_updates["ai_job_match_score"]  = float(applied_result.get("score", 0.0))
            ai_updates["ai_job_match_bucket"] = str(applied_result.get("bucket", "Weak"))
            ai_updates["ai_job_match_json"]   = applied_result

        ai_updates["ai_recommended_role"] = best_title

        # Prescreen summary
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
            print(f"[AI] Pipeline completed successfully for applicant {new_ref.id}")

    except Exception as e:
        print(f"[AI] Pipeline failed: {e}")
        # Log the error but don't fail the request
        try:
            new_ref.update({"ai_pipeline_error": str(e)})
        except:
            pass

    return applicant_data


@router.patch("/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: str, payload: ApplicantStatusUpdate):
    db  = get_db()
    ref = db.collection("applicants").document(applicant_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Applicant not found")
    ref.update({"hiring_status": payload.hiring_status})
    return doc_to_dict(ref.get())


@router.get("/jobs")
def get_public_jobs():
    db   = get_db()
    docs = db.collection("jobs").where("status", "==", "Open").get()
    return [doc_to_dict(d) for d in docs]