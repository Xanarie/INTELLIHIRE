from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

import os, json

service_account_info = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
cred = credentials.Certificate(service_account_info)

# Initialize Firebase Admin once
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)


router = APIRouter()

# Pydantic model for login
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(user: LoginRequest):
    try:
        # Verify user exists in Firebase
        firebase_user = firebase_auth.get_user_by_email(user.email)
        # Firebase Admin SDK cannot verify password directly,
        # you should rely on client-side Firebase login
        return {"message": f"User {firebase_user.email} exists"}
    except firebase_auth.UserNotFoundError:
        raise HTTPException(status_code=401, detail="Invalid email or password")