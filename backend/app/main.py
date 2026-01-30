from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import applicants, admin
from .database import engine, Base
from app.ai.routers.ai import router as ai_router

app = FastAPI(title="IntelliHire API")

app.include_router(ai_router, prefix="/ai", tags=["AI"])

#plugs
app.include_router(applicants.router)
app.include_router(admin.router)

Base.metadata.create_all(bind=engine)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, PUT, DELETE, etc.
    allow_headers=["*"],
)

app.mount("/resumes", StaticFiles(directory="resumes"), name="resumes")


@app.get("/")
def root():
    return {"message": "Welcome to the IntelliHire Central API"}