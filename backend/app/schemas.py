from pydantic import BaseModel, EmailStr
from typing import Optional, List


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


class JobCreate(BaseModel):
    title: str
    department: str
    status: str = "Open"
    applicant_limit: int = 50

    class Config:
        from_attributes = True
