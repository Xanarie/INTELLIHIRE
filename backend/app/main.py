from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import applicants, admin
from app.ai.routers.ai import router as ai_router
from app.database import engine, Base

app = FastAPI(title="IntelliHire API")

app.include_router(ai_router, prefix="/ai", tags=["AI"])
app.include_router(applicants.router)
app.include_router(admin.router)

# Create tables (thesis/dev only; later replace with Alembic migrations)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/resumes", StaticFiles(directory="resumes"), name="resumes")

@app.get("/")
def root():
    return {"message": "Welcome to the IntelliHire Central API"}