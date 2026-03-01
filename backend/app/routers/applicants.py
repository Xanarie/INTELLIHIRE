import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import Applicant, Job
from app.schemas import ApplicantStatusUpdate, UserResponse
from app.ai.matching import score_applicant
from app.ai.summarizer import summarize_prescreen
from app.ai.pdf_extract import extract_resume_text
from app.ai.resume_score import score_resume_quality

router = APIRouter(
    prefix="/api/applicants",
    tags=["Applicant Hub"],
)

UPLOAD_DIR = "resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
    db: Session = Depends(get_db),
):
    # 1) Fetch job once — reused for limit check AND matching
    job = db.query(Job).filter(Job.title == applied_position).first()

    # 2) Check applicant limit
    if job:
        current_count = db.query(Applicant).filter(
            Applicant.applied_position == applied_position
        ).count()
        if current_count >= job.applicant_limit:
            job.status = "Closed"
            db.commit()

    # 3) Email duplicate check
    if db.query(Applicant).filter(Applicant.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 4) Save resume file
    file_ext = resume.filename.split(".")[-1].lower()
    resume_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, resume_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(resume.file, buffer)

    # 5) Create applicant record
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
        resume_path=file_path,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # ── AI Pipeline ────────────────────────────────────────────────────────
    # Step A: Extract resume text (once, shared by all steps below)
    # Step B: Resume quality score  (no job needed)
    # Step C: Job match score       (uses full_job_text from all 4 sections)
    # Step D: Prescreen summary
    # ───────────────────────────────────────────────────────────────────────

    # Step A
    resume_focus_text = ""
    try:
        extracted = extract_resume_text(file_path)
        resume_focus_text = (extracted.get("focus_text") or "").strip()
    except Exception as e:
        print(f"[AI] PDF extract failed for applicant {new_user.id}: {e}")

    if not resume_focus_text:
        db.refresh(new_user)
        return new_user

    # Step B: Resume quality score
    try:
        resume_score = score_resume_quality(resume_focus_text)
        new_user.ai_resume_score = float(resume_score.get("score", 0.0))
        new_user.ai_resume_bucket = str(resume_score.get("bucket", "Weak"))
        new_user.ai_resume_score_json = resume_score
    except Exception as e:
        print(f"[AI] Resume scoring failed for applicant {new_user.id}: {e}")

    # Step C: Job match (uses the combined full_job_text from all 4 sections)
    job_match_result = None
    if job and job.has_description:
        try:
            job_match_result = score_applicant(
                candidate_text=resume_focus_text,
                job_text=job.full_job_text,
            )
            new_user.ai_job_match_score = float(job_match_result.get("score", 0.0))
            new_user.ai_job_match_bucket = str(job_match_result.get("bucket", "Needs Review"))
            new_user.ai_job_match_json = job_match_result
        except Exception as e:
            print(f"[AI] Job matching failed for applicant {new_user.id}: {e}")

    # Step D: Prescreen summary
    summary_input = job_match_result or {
        "score": new_user.ai_resume_score or 0.0,
        "bucket": new_user.ai_resume_bucket or "Weak",
        "knockout": False,
        "breakdown": {},
        "must_haves": {"matched": [], "missing": []},
        "mode": "resume_only",
    }
    try:
        prescreen_result = summarize_prescreen(
            resume_focus_text=resume_focus_text,
            job_title=applied_position,
            match_result=summary_input,
        )
        new_user.ai_prescreening_summary = prescreen_result.get("summary", "")
    except Exception as e:
        print(f"[AI] Prescreen summary failed for applicant {new_user.id}: {e}")

    db.commit()
    db.refresh(new_user)
    return new_user


# ── Admin endpoints ────────────────────────────────────────────────────────────

@router.get("/all", response_model=List[UserResponse])
async def get_all_applicants(db: Session = Depends(get_db)):
    return db.query(Applicant).all()


@router.patch("/{applicant_id}", response_model=UserResponse)
def update_applicant_status(
    applicant_id: int,
    payload: ApplicantStatusUpdate,
    db: Session = Depends(get_db),
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
    return db.query(Job).filter(Job.status == "Open").all()