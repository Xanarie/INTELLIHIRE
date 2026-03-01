from pydantic import BaseModel, EmailStr
from typing import Optional, Any


class StatusUpdate(BaseModel):
    hiring_status: str


class UserResponse(BaseModel):
    id: int
    f_name: str
    l_name: str
    email: str
    phone: str
    applied_position: str
    current_city: Optional[str] = None
    hiring_status: Optional[str] = "Pre-screening"

    # Resume quality score (standalone)
    ai_resume_score: Optional[float] = None
    ai_resume_bucket: Optional[str] = None
    ai_resume_score_json: Optional[Any] = None

    # Job match score
    ai_job_match_score: Optional[float] = None
    ai_job_match_bucket: Optional[str] = None
    ai_job_match_json: Optional[Any] = None

    # Recruiter prescreen summary
    ai_prescreening_summary: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    f_name: Optional[str] = None
    l_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    applied_position: Optional[str] = None


class ApplicantStatusResponse(BaseModel):
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicantStatusUpdate(BaseModel):
    hiring_status: str = "Pending"


# ---------- Jobs ----------

class JobCreate(BaseModel):
    title: str
    department: str
    status: str = "Open"
    applicant_limit: int = 50
    key_responsibilities: Optional[str] = None
    required_qualifications: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    key_competencies: Optional[str] = None

    class Config:
        from_attributes = True


class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    applicant_limit: Optional[int] = None
    key_responsibilities: Optional[str] = None
    required_qualifications: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    key_competencies: Optional[str] = None


class JobResponse(BaseModel):
    id: int
    title: str
    department: str
    status: str
    applicant_limit: int
    key_responsibilities: Optional[str] = None
    required_qualifications: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    key_competencies: Optional[str] = None

    class Config:
        from_attributes = True