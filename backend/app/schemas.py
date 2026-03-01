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
    ai_prescreening_summary: Optional[str] = None
    ai_match_json: Optional[Any] = None

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


# ---------- Jobs / Positions ----------

class JobCreate(BaseModel):
    title: str
    department: str
    status: str = "Open"
    applicant_limit: int = 50
    job_description: Optional[str] = None  # NEW

    class Config:
        from_attributes = True

class JobUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    applicant_limit: Optional[int] = None
    job_description: Optional[str] = None  


class JobResponse(BaseModel):
    id: int
    title: str
    department: str
    status: str
    applicant_limit: int
    job_description: Optional[str] = None  

    class Config:
        from_attributes = True