import os
<<<<<<< HEAD
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
        for f in ("key_responsibilities", "required_qualifications",
                  "preferred_qualifications", "key_competencies")
    )


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

    # 1. Duplicate email check
    if db.collection("applicants").where("email", "==", email).limit(1).get():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Job limit check
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

    # 3. Upload resume to Cloudinary
    resume_bytes  = await resume.read()
    content_type  = resume.content_type or "application/pdf"
    upload_result = upload_resume(resume_bytes, resume.filename)
    download_url  = upload_result["download_url"]
    public_id     = upload_result["public_id"]

    # 4. Save initial Firestore document
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
        "ai_recommended_role": applied_position,  # default until AI runs
    }
    _, new_ref = db.collection("applicants").add(applicant_data)
    applicant_data["id"] = new_ref.id

    # 5. AI pipeline (best-effort, never blocks response)
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
            return applicant_data

        ai_updates = {}

        # Resume quality score
        try:
            rs = score_resume_quality(resume_focus_text)
            ai_updates["ai_resume_score"]      = float(rs.get("score", 0.0))
            ai_updates["ai_resume_bucket"]     = str(rs.get("bucket", "Weak"))
            ai_updates["ai_resume_score_json"] = rs
        except Exception as e:
            print(f"[AI] Resume score failed: {e}")

        # ── Match against ALL open jobs in parallel ────────────────────────
        open_jobs = db.collection("jobs").where("status", "==", "Open").get()
        scoreable_jobs = [doc_to_dict(j) for j in open_jobs if _has_description(doc_to_dict(j))]

        def _score_job(jd):
            try:
                result = score_applicant(resume_focus_text, _job_full_text(jd))
                return jd["title"], jd, result
            except Exception as e:
                print(f"[AI] Scoring job '{jd.get('title')}' failed: {e}")
                return jd["title"], jd, None

        best_title  = applied_position
        best_score  = -1.0
        best_result = None
        applied_result = None

        if scoreable_jobs:
            with ThreadPoolExecutor(max_workers=4) as pool:
                futures = [pool.submit(_score_job, jd) for jd in scoreable_jobs]
                for future in as_completed(futures):
                    title, jd, result = future.result()
                    if result is None:
                        continue
                    sc = float(result.get("score", 0.0))
                    if title == applied_position:
                        applied_result = result
                    if sc > best_score:
                        best_score  = sc
                        best_title  = title
                        best_result = result

        # Store applied-position match (what the applicant chose)
        if applied_result:
            ai_updates["ai_job_match_score"]  = float(applied_result.get("score", 0.0))
            ai_updates["ai_job_match_bucket"] = str(applied_result.get("bucket", "Needs Review"))
            ai_updates["ai_job_match_json"]   = applied_result
            ai_updates["ai_match_json"]       = applied_result

        # Store best role found across all jobs
        ai_updates["ai_recommended_role"] = best_title

        # Build summary input (use applied-position match for score context)
        summary_match = applied_result or best_result or {
            "score":      ai_updates.get("ai_resume_score", 0.0),
            "bucket":     ai_updates.get("ai_resume_bucket", "Weak"),
            "knockout":   False, "breakdown": {},
            "must_haves": {"matched": [], "missing": []}, "mode": "resume_only",
        }

        try:
            prescreen = summarize_prescreen(
                resume_focus_text=resume_focus_text,
                job_title=applied_position,
                match_result=summary_match,
                suitable_role=best_title,          # ← AI-chosen best role
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
=======
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models import Applicant, Job  # 1. ADDED Job here
from app.schemas import ApplicantStatusUpdate, UserResponse

router = APIRouter(
    prefix="/api/applicants",
    tags=["Applicant Hub"]
)

UPLOAD_DIR = "resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- APPLICANT ACTIONS ---
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
    resume: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    # Check job applicant limit
    job = db.query(Job).filter(Job.title == applied_position).first()
    
    if job:
        current_count = db.query(Applicant).filter(
            Applicant.applied_position == applied_position
        ).count()
        
        if current_count >= job.applicant_limit:
            job.status = "Closed"  
            db.commit()

    # Email duplication check
    if db.query(Applicant).filter(Applicant.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Resume upload
    file_ext = resume.filename.split('.')[-1]
    resume_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, resume_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(resume.file, buffer)

    # Create applicant record
    new_user = Applicant(
        f_name=f_name,
        l_name=l_name,
        email=email,
        phone=phone,
        age=age,
        gender=gender,
        current_city=current_city,
        current_province=current_province,
        home_address=home_address,
        education=education,
        app_source=app_source,
        stable_internet=stable_internet,
        isp=isp,
        applied_position=applied_position,
        resume_path=file_path
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    final_count = db.query(Applicant).filter(Applicant.applied_position == applied_position).count()
    if job and final_count >= job.applicant_limit:
        job.status = "Closed"
        db.commit()
    return new_user


@router.get("/all", response_model=List[UserResponse])
async def get_all_applicants(db: Session = Depends(get_db)):
    """Fetches all applicant records for the Admin Dashboard"""
    return db.query(Applicant).all()

@router.patch("/{applicant_id}", response_model=UserResponse)
def update_applicant_status(
    applicant_id: int,
    payload: ApplicantStatusUpdate,
    db: Session = Depends(get_db)
):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    applicant.hiring_status = payload.hiring_status
    db.commit()
    db.refresh(applicant)
    return applicant

@router.get("/jobs")
def get_public_jobs(db: Session = Depends(get_db)):
    """
    Fetches ONLY 'Open' jobs for the Applicant Hub dropdown.
    """
    # This filter is the key!
    return db.query(Job).filter(Job.status == "Open").all()
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
