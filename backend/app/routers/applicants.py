import os
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
    return new_user

# --- ADMIN-SIDE UPDATES (STILL IN THIS ROUTER FOR NOW) ---

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