<<<<<<< HEAD
# backend/app/main.py

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import applicants, admin
from app.ai.routers.ai import router as ai_router
from app.firebase_client import get_db   # warms up the Firebase connection on startup

app = FastAPI(title="IntelliHire API")

# Warm Firebase on startup so the first request isn't slow
@app.on_event("startup")
def _warm_firebase():
    get_db()

app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(applicants.router)
app.include_router(admin.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        os.getenv("FRONTEND_URL", ""),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to the IntelliHire API"}
=======
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import applicants, admin
from .database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="IntelliHire API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],
)

app.mount("/resumes", StaticFiles(directory="resumes"), name="resumes")

#plugs
app.include_router(applicants.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {"message": "Welcome to the IntelliHire Central API"}
>>>>>>> 05ef615b6d098f2c2a9b43995a0643c6bbcd19a2
