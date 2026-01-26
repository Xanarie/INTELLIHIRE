from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import desc
from ..database import get_db
from ..models import Applicant, ApplicantStatus , Job , Employee
from app.schemas import UserResponse, ApplicantStatusResponse, UserUpdate, JobCreate, StatusUpdate


router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)
# ----------------------------
# RECRUITMENT MANAGEMENT ENDPOINTS   
# ----------------------------

@router.get("/applicants", response_model=List[UserResponse])
def get_all_applicants(db: Session = Depends(get_db)):
    applicants = db.query(Applicant).all()
    return applicants

@router.get("/applicants/{applicant_id}", response_model=UserResponse)
def get_applicant(applicant_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single applicant by ID.
    """
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.put("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant(applicant_id: int, applicant_data: UserUpdate, db: Session = Depends(get_db)):
    """
    Update applicant details.
    Only fields provided in the request will be updated.
    """
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    for key, value in applicant_data.dict(exclude_unset=True).items():
        setattr(applicant, key, value)

    db.commit()
    db.refresh(applicant)
    return applicant


@router.patch("/applicants/{applicant_id}")
def update_applicant_status(applicant_id: int, status_data: StatusUpdate, db: Session = Depends(get_db)):
    # Find the applicant
    db_applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not db_applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    
    # Update only the status
    db_applicant.hiring_status = status_data.hiring_status
    db.commit()
    db.refresh(db_applicant)
    return db_applicant


# ----------------------------
# APPLICANT STATUS ENDPOINTS
# ----------------------------

@router.post("/status/{applicant_id}", response_model=ApplicantStatusResponse)
def create_status(applicant_id: int, status_data: ApplicantStatusResponse, db: Session = Depends(get_db)):
    """
    Create a new status entry for a specific applicant.
    """
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    new_status = ApplicantStatus(
        applicant_id=applicant_id,
        status=status_data.status,
        notes=status_data.notes
    )
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    return new_status


@router.get("/status/{applicant_id}", response_model=List[ApplicantStatusResponse])
def get_applicant_statuses(applicant_id: int, db: Session = Depends(get_db)):
    """
    Retrieve all status entries for a specific applicant.
    """
    statuses = db.query(ApplicantStatus).filter(ApplicantStatus.applicant_id == applicant_id).all()
    if not statuses:
        raise HTTPException(status_code=404, detail="No status records found")
    return statuses


@router.get("/status/{applicant_id}/latest")
def get_latest_status(applicant_id: int, db: Session = Depends(get_db)):
    status = db.query(ApplicantStatus).filter(
        ApplicantStatus.applicant_id == applicant_id
    ).order_by(ApplicantStatus.id.desc()).first()
    
    if not status:
        return {"status": "Submitted", "applicant_id": applicant_id}
    return status

@router.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: int, db: Session = Depends(get_db)):
    """
    Delete an applicant and their associated status records.
    """
    # 1. Find the applicant
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    try:
        # 2. Delete related status records first (if not handled by Cascade Delete in DB)
        db.query(ApplicantStatus).filter(ApplicantStatus.applicant_id == applicant_id).delete()
        
        # 3. Delete the applicant
        db.delete(applicant)
        
        # 4. Commit changes
        db.commit()
        return {"message": f"Applicant {applicant_id} and related records deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# ----------------------------
# JOB POSITION ENDPOINTS
# ----------------------------

@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    """Fetches all jobs for the Admin JobTab (Open and Closed)"""
    return db.query(Job).all()

@router.post("/jobs")
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    new_job = Job(**job_data.dict())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.put("/jobs/{job_id}")
def update_job(job_id: int, job_data: JobCreate, db: Session = Depends(get_db)):
    """Updates a job position using the request body"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Dynamically update based on schema keys
    for key, value in job_data.dict(exclude_unset=True).items():
        setattr(job, key, value)
    
    db.commit()
    db.refresh(job)
    return job

@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    """Deletes a job position"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}

# ----------------------------
# EMPLOYEE MANAGEMENT ENDPOINTS
# ----------------------------

@router.get("/employees")
def get_all_employees(db: Session = Depends(get_db)):
    """Fetches all staff from the database for the EmployeeTab"""
    return db.query(Employee).all()

@router.post("/employees")
def create_employee(emp_data: dict, db: Session = Depends(get_db)):
    """Saves a new staff member to the database"""
    new_emp = Employee(
        name=emp_data.get("name"),
        role=emp_data.get("role"),
        dept=emp_data.get("dept", "General")
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return new_emp


# ----------------------------
# ONBOARDING MANAGEMENT ENDPOINTS
# ----------------------------

@router.get("/onboarding")
def get_onboarding_applicants(db: Session = Depends(get_db)):
    """Fetches all applicants currently in the onboarding process."""
    # This filters for applicants with the status 'Onboarding'
    return db.query(Applicant).filter(Applicant.hiring_status == "Onboarding").all()
