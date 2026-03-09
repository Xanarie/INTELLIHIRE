from pydantic import BaseModel, EmailStr
from typing import Optional, Any


# ── Applicant ─────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    f_name: str
    l_name: str
    email: str
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    current_city: Optional[str] = None
    current_province: Optional[str] = None
    home_address: Optional[str] = None
    education: Optional[str] = None
    app_source: Optional[str] = None
    stable_internet: Optional[str] = None
    isp: Optional[str] = None
    applied_position: Optional[str] = None
    resume_path: Optional[str] = None
    resume_storage_path: Optional[str] = None
    resume_focus_text: Optional[str] = None  # Extracted text for AI processing
    hiring_status: Optional[str] = "Pre-screening"
    ai_prescreening_summary: Optional[str] = None
    ai_match_json: Optional[Any] = None
    ai_resume_score: Optional[float] = None
    ai_resume_bucket: Optional[str] = None
    ai_resume_score_json: Optional[Any] = None
    ai_job_match_score: Optional[float] = None
    ai_job_match_bucket: Optional[str] = None
    ai_job_match_json: Optional[Any] = None
    ai_recommended_role: Optional[str] = None
    recruiter_notes: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    f_name: Optional[str] = None
    l_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    applied_position: Optional[str] = None
    recruiter_notes: Optional[str] = None


class ApplicantStatusUpdate(BaseModel):
    hiring_status: str = "Pre-screening"


# ── Applicant Status ───────────────────────────────────────────────────────────

class ApplicantStatusResponse(BaseModel):
    id: Optional[str] = None
    applicant_id: str
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobCreate(BaseModel):
    title: str
    department: str
    status: str = "Open"
    applicant_limit: int = 50
    job_summary: Optional[str] = None
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
    job_summary: Optional[str] = None
    key_responsibilities: Optional[str] = None
    required_qualifications: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    key_competencies: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    title: str
    department: str
    status: str
    applicant_limit: int
    created_at: Optional[str] = None
    job_summary: Optional[str] = None
    key_responsibilities: Optional[str] = None
    required_qualifications: Optional[str] = None
    preferred_qualifications: Optional[str] = None
    key_competencies: Optional[str] = None

    class Config:
        from_attributes = True


# ── Employees ─────────────────────────────────────────────────────────────────

class EmployeeResponse(BaseModel):
    id: str
    name: str
    role: str
    dept: Optional[str] = "General"

    class Config:
        from_attributes = True


# ── Misc ──────────────────────────────────────────────────────────────────────

class StatusUpdate(BaseModel):
    hiring_status: str


# ── Authentication ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
