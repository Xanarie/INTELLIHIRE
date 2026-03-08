import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import applicants, admin
from app.routers.logs import router as logs_router
from app.ai.routers.ai import router as ai_router
from app.firebase_client import get_db
from app.routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        get_db()   # warm Firebase connection pool
    except RuntimeError as e:
        print(f"⚠️  {e}")
    yield


app = FastAPI(title="IntelliHire API", lifespan=lifespan)

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

app.include_router(ai_router,    prefix="/ai", tags=["AI"])
app.include_router(applicants.router)
app.include_router(admin.router)
app.include_router(logs_router)
app.include_router(auth_router, prefix="/auth")


@app.get("/")
def root():
    return {"message": "Welcome to the IntelliHire API"}