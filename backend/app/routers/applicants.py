import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional, List
from ..database import get_db
from ..models import Applicant, Job
from app.schemas import ApplicantStatusUpdate, UserResponse
from app.ai.matching import score_applicant
from app.ai.summarizer import summarize_prescreen
from app.ai.pdf_extract import extract_resume_text  # NEW: use actual public function from pdf_extract.py
from app.ai.resume_score import score_resume_quality  # NEW

router = APIRouter(
    prefix="/api/applicants",
    tags=["Applicant Hub"]
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
    file_ext = resume.filename.split(".")[-1]
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

    # -----------------------------
    # AI: RESUME EXTRACT + RESUME SCORE + PRESCREEN SUMMARY
    # -----------------------------

    # 1) Extract resume text once (focus_text is what we use)  # NEW
    try:  # NEW
        extracted = extract_resume_text(file_path)  # NEW
        resume_focus_text = (extracted.get("focus_text") or "").strip()  # NEW
    except Exception as e:  # NEW
        print("PDF extract failed:", e)  # NEW
        resume_focus_text = ""  # NEW

    # 2) Resume-only score (does NOT need job description)  # NEW
    if resume_focus_text:  # NEW
        try:  # NEW
            resume_score = score_resume_quality(resume_focus_text)  # NEW

            # Save resume scoring fields (make sure these columns exist in Applicant model/DB)  # NEW
            new_user.ai_resume_score = float(resume_score.get("score", 0.0))  # NEW
            new_user.ai_resume_bucket = str(resume_score.get("bucket", "Needs Review"))  # NEW
            new_user.ai_resume_score_json = resume_score  # NEW

            db.commit()  # NEW
            db.refresh(new_user)  # NEW
        except Exception as e:  # NEW
            print("Resume scoring failed:", e)  # NEW

    # 3) Job lookup (optional — matching only runs if description exists)  # NEW
    job = db.query(Job).filter(Job.title == applied_position).first()  # NEW

    # 4) Build match_result:
    #    - if job description exists -> real job compatibility score
    #    - else -> fallback so prescreen summary still works  # NEW
    match_result = {  # NEW
        "score": float(getattr(new_user, "ai_resume_score", 0.0) or 0.0),  # NEW: fallback uses resume score
        "bucket": str(getattr(new_user, "ai_resume_bucket", "Needs Review") or "Needs Review"),  # NEW
        "knockout": False,  # NEW
        "breakdown": {"semantic_similarity": 0.0},  # NEW
        "must_haves": {"matched": [], "missing": []},  # NEW
        "mode": "resume_only",  # NEW
    }

    if resume_focus_text and job and getattr(job, "description", None):  # NEW
        try:  # NEW
            match_result = score_applicant(resume_focus_text, job.description)  # NEW
            match_result["mode"] = "job_match"  # NEW
        except Exception as e:  # NEW
            print("Job matching failed:", e)  # NEW

    # 5) Prescreen summary (works with fallback match_result)  # NEW
    if resume_focus_text:  # NEW
        try:  # NEW
            prescreen_result = summarize_prescreen(  # NEW
                resume_focus_text=resume_focus_text,  # NEW
                job_title=applied_position,  # NEW
                match_result=match_result,  # NEW
            )

            new_user.ai_prescreening_summary = prescreen_result.get("summary", "")  # NEW
            new_user.ai_match_json = match_result  # NEW

            db.commit()  # NEW
            db.refresh(new_user)  # NEW
        except Exception as e:  # NEW
            print("Prescreen summarizer failed:", e)  # NEW

    return new_user


# --- ADMIN-SIDE UPDATES (STILL IN THIS ROUTER FOR NOW) ---

@router.get("/all", response_model=List[UserResponse])
async def get_all_applicants(db: Session = Depends(get_db)):
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
    # This filter is the key!
    return db.query(Job).filter(Job.status == "Open").all()