from pydantic import BaseModel, EmailStr
from typing import Optional, List

    # This matches the "UserResponse" used in  applicants.py
class UserResponse(BaseModel):
    id: int
    f_name: str
    l_name: str
    email: str
    phone: str
    applied_position: str
    current_city: Optional[str] = None
        
    class Config:
        from_attributes = True

    # This matches the "UserUpdate" used in  admin.py PUT route
class UserUpdate(BaseModel):
    f_name: Optional[str] = None
    l_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    applied_position: Optional[str] = None

    # This matches the "ApplicantStatusResponse" used in admin.py
class ApplicantStatusResponse(BaseModel):
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True

    # This update model is for the applicant status update
class ApplicantStatusUpdate(BaseModel):
    hiring_status: str = "Pending" 


class JobCreate(BaseModel):
    title: str
    department: str
    status: str = "Open"