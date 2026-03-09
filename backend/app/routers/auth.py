from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from firebase_admin import auth as firebase_auth

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(user: LoginRequest):
    try:
        firebase_user = firebase_auth.get_user_by_email(user.email)
        return {"message": f"User {firebase_user.email} exists"}
    except firebase_auth.UserNotFoundError:
        raise HTTPException(status_code=401, detail="Invalid email or password")