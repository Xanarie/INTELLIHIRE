from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from ..models import Applicant, ApplicantStatus, Job, Employee
from app.schemas import (
    UserResponse,
    ApplicantStatusResponse,
    UserUpdate,
    JobCreate,
    StatusUpdate,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"]
)

# ----------------------------
# RECRUITMENT MANAGEMENT ENDPOINTS
# ----------------------------

@router.get("/applicants", response_model=List[UserResponse])
def get_all_applicants(db: Session = Depends(get_db)):
    return db.query(Applicant).all()


@router.get("/applicants/{applicant_id}", response_model=UserResponse)
def get_applicant(applicant_id: int, db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return applicant


@router.put("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant(applicant_id: int, applicant_data: UserUpdate, db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    payload = applicant_data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(applicant, key, value)

    db.commit()
    db.refresh(applicant)
    return applicant


@router.patch("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: int, status_data: StatusUpdate, db: Session = Depends(get_db)):
    db_applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not db_applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    db_applicant.hiring_status = status_data.hiring_status
    db.commit()
    db.refresh(db_applicant)
    return db_applicant


@router.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: int, db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    try:
        db.query(ApplicantStatus).filter(ApplicantStatus.applicant_id == applicant_id).delete()
        db.delete(applicant)
        db.commit()
        return {"message": f"Applicant {applicant_id} and related records deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


# ----------------------------
# APPLICANT STATUS ENDPOINTS
# ----------------------------

@router.post("/status/{applicant_id}", response_model=ApplicantStatusResponse)
def create_status(applicant_id: int, status_data: ApplicantStatusResponse, db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    new_status = ApplicantStatus(
        applicant_id=applicant_id,
        status=status_data.status,
        notes=status_data.notes,
    )
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    return new_status


@router.get("/status/{applicant_id}", response_model=List[ApplicantStatusResponse])
def get_applicant_statuses(applicant_id: int, db: Session = Depends(get_db)):
    statuses = (
        db.query(ApplicantStatus)
        .filter(ApplicantStatus.applicant_id == applicant_id)
        .all()
    )
    if not statuses:
        raise HTTPException(status_code=404, detail="No status records found")
    return statuses


@router.get("/status/{applicant_id}/latest")
def get_latest_status(applicant_id: int, db: Session = Depends(get_db)):
    status = (
        db.query(ApplicantStatus)
        .filter(ApplicantStatus.applicant_id == applicant_id)
        .order_by(ApplicantStatus.id.desc())
        .first()
    )
    if not status:
        return {"status": "Submitted", "applicant_id": applicant_id}
    return status


# ----------------------------
# JOB POSITION ENDPOINTS
# ----------------------------

@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()

    changed = False
    for job in jobs:
        # Count current applicants for this job title
        count = db.query(Applicant).filter(Applicant.applied_position == job.title).count()

        # Auto-close if full
        if job.applicant_limit is not None and count >= job.applicant_limit and job.status == "Open":
            job.status = "Closed"
            changed = True

    if changed:
        db.commit()

    return jobs


@router.post("/jobs")
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    payload = job_data.model_dump()
    new_job = Job(**payload)
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job


@router.put("/jobs/{job_id}")
def update_job(job_id: int, job_data: JobCreate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    payload = job_data.model_dump(exclude_unset=True)
    for key, value in payload.items():
        setattr(job, key, value)

    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
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
    return db.query(Employee).all()


@router.post("/employees")
def create_employee(emp_data: dict, db: Session = Depends(get_db)):
    new_emp = Employee(
        name=emp_data.get("name"),
        role=emp_data.get("role"),
        dept=emp_data.get("dept", "General"),
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
    return db.query(Applicant).filter(Applicant.hiring_status == "Onboarding").all()