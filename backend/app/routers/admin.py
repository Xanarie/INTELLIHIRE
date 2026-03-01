import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Applicant, ApplicantStatus, Job, Employee
from app.schemas import (
    UserResponse,
    ApplicantStatusResponse,
    UserUpdate,
    JobCreate,
    JobUpdate,
    StatusUpdate,
)
# AI imports are intentionally lazy (inside functions below)
# to prevent sentence-transformers from loading at server startup.

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
)


# ── Applicants ─────────────────────────────────────────────────────────────────

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
    for key, value in applicant_data.model_dump(exclude_unset=True).items():
        setattr(applicant, key, value)
    db.commit()
    db.refresh(applicant)
    return applicant


@router.patch("/applicants/{applicant_id}", response_model=UserResponse)
def update_applicant_status(applicant_id: int, status_data: StatusUpdate, db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    applicant.hiring_status = status_data.hiring_status
    db.commit()
    db.refresh(applicant)
    return applicant


@router.delete("/applicants/{applicant_id}")
def delete_applicant(applicant_id: int, db: Session = Depends(get_db)):
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    try:
        db.query(ApplicantStatus).filter(ApplicantStatus.applicant_id == applicant_id).delete()
        db.delete(applicant)
        db.commit()
        return {"message": f"Applicant {applicant_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── Resume file viewer ─────────────────────────────────────────────────────────

@router.get("/applicants/{applicant_id}/resume")
def view_resume(applicant_id: int, db: Session = Depends(get_db)):
    """
    Streams the applicant's resume file directly so the browser can open it.
    Works for PDF and DOCX files.
    """
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")
    if not applicant.resume_path or not os.path.exists(applicant.resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found")

    ext = applicant.resume_path.split(".")[-1].lower()
    media_type = "application/pdf" if ext == "pdf" else "application/octet-stream"
    filename = f"{applicant.f_name}_{applicant.l_name}_resume.{ext}"

    # inline → browser opens the file; attachment → forces download
    return FileResponse(
        path=applicant.resume_path,
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""},
    )


# ── Re-run Prescreen ───────────────────────────────────────────────────────────

@router.post("/applicants/{applicant_id}/prescreen", response_model=UserResponse)
def rerun_prescreen(applicant_id: int, db: Session = Depends(get_db)):
    """
    Re-runs the full AI pipeline (resume score + job match + summary) for an existing applicant.
    """
    from app.ai.pdf_extract import extract_resume_text
    from app.ai.resume_score import score_resume_quality
    from app.ai.matching import score_applicant
    from app.ai.summarizer import summarize_prescreen

    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    if not applicant.resume_path or not os.path.exists(applicant.resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")

    # Step A: Extract resume text
    try:
        extracted = extract_resume_text(applicant.resume_path)
        resume_focus_text = (extracted.get("focus_text") or "").strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume extraction failed: {e}")

    if not resume_focus_text:
        raise HTTPException(status_code=400, detail="Could not extract text from resume")

    # Step B: Resume quality score
    try:
        resume_score = score_resume_quality(resume_focus_text)
        applicant.ai_resume_score = float(resume_score.get("score", 0.0))
        applicant.ai_resume_bucket = str(resume_score.get("bucket", "Weak"))
        applicant.ai_resume_score_json = resume_score
    except Exception as e:
        print(f"[Prescreen] Resume scoring failed: {e}")

    # Step C: Job match (uses all 4 description sections)
    job = db.query(Job).filter(Job.title == applicant.applied_position).first()
    job_match_result = None
    if job and job.has_description:
        try:
            job_match_result = score_applicant(
                candidate_text=resume_focus_text,
                job_text=job.full_job_text,
            )
            applicant.ai_job_match_score = float(job_match_result.get("score", 0.0))
            applicant.ai_job_match_bucket = str(job_match_result.get("bucket", "Needs Review"))
            applicant.ai_job_match_json = job_match_result
        except Exception as e:
            print(f"[Prescreen] Job matching failed: {e}")

    # Step D: Prescreen summary
    summary_input = job_match_result or {
        "score": applicant.ai_resume_score or 0.0,
        "bucket": applicant.ai_resume_bucket or "Weak",
        "knockout": False,
        "breakdown": {},
        "must_haves": {"matched": [], "missing": []},
        "mode": "resume_only",
    }
    try:
        prescreen_result = summarize_prescreen(
            resume_focus_text=resume_focus_text,
            job_title=applicant.applied_position,
            match_result=summary_input,
        )
        applicant.ai_prescreening_summary = prescreen_result.get("summary", "")
    except Exception as e:
        print(f"[Prescreen] Summary failed: {e}")

    db.commit()
    db.refresh(applicant)
    return applicant


# ── Role suggestions ───────────────────────────────────────────────────────────

@router.get("/applicants/{applicant_id}/role-suggestions")
def get_role_suggestions(applicant_id: int, db: Session = Depends(get_db)):
    """
    Scores this applicant's resume against ALL open jobs that have descriptions,
    and returns them ranked by match score. Used for the 'Recommended Role' feature.
    """
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    if not applicant.resume_path or not os.path.exists(applicant.resume_path):
        raise HTTPException(status_code=404, detail="Resume file not found on disk")

    # Lazy imports — keeps sentence-transformers out of server startup
    from app.ai.pdf_extract import extract_resume_text
    from app.ai.matching import score_applicant

    # Extract resume text fresh for accurate comparison
    try:
        extracted = extract_resume_text(applicant.resume_path)
        resume_text = (extracted.get("focus_text") or "").strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume extraction failed: {e}")

    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not extract text from resume")

    # Score against all open jobs that have a description
    open_jobs = db.query(Job).filter(Job.status == "Open").all()
    results = []

    for job in open_jobs:
        if not job.has_description:
            continue
        try:
            match = score_applicant(candidate_text=resume_text, job_text=job.full_job_text)
            results.append({
                "job_id":    job.id,
                "title":     job.title,
                "department": job.department,
                "score":     match["score"],
                "bucket":    match["bucket"],
                "knockout":  match["knockout"],
                "matched_keywords": match["must_haves"]["matched"],
                "missing_keywords": match["must_haves"]["missing"],
                "is_applied_position": job.title == applicant.applied_position,
            })
        except Exception as e:
            print(f"[RoleSuggest] Failed scoring job {job.id}: {e}")

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "applicant_id": applicant_id,
        "applied_position": applicant.applied_position,
        "suggestions": results,
    }


# ── Applicant statuses ─────────────────────────────────────────────────────────

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
    statuses = db.query(ApplicantStatus).filter(ApplicantStatus.applicant_id == applicant_id).all()
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


# ── Jobs ───────────────────────────────────────────────────────────────────────

@router.get("/jobs")
def get_all_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).all()
    changed = False
    for job in jobs:
        count = db.query(Applicant).filter(Applicant.applied_position == job.title).count()
        if job.applicant_limit is not None and count >= job.applicant_limit and job.status == "Open":
            job.status = "Closed"
            changed = True
    if changed:
        db.commit()
    return jobs


@router.post("/jobs")
def create_job(job_data: JobCreate, db: Session = Depends(get_db)):
    new_job = Job(**job_data.model_dump())
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job


@router.put("/jobs/{job_id}")
def update_job(job_id: int, job_data: JobCreate, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    for key, value in job_data.model_dump(exclude_unset=True).items():
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


# ── Employees ──────────────────────────────────────────────────────────────────

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


# ── Onboarding ─────────────────────────────────────────────────────────────────

@router.get("/onboarding")
def get_onboarding_applicants(db: Session = Depends(get_db)):
    return db.query(Applicant).filter(Applicant.hiring_status == "Onboarding").all()