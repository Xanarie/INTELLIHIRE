from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict

from app.ai.matching import score_applicant
from app.ai.summarizer import summarize_prescreen

router = APIRouter()


class PrescreenRequest(BaseModel):
    resume_focus_text: str = Field(...)
    job_description: str = Field(...)
    job_title: Optional[str] = None


class PrescreenResponse(BaseModel):
    match: Dict[str, Any]
    prescreen: Dict[str, Any]


@router.post("/prescreen", response_model=PrescreenResponse)
def prescreen(req: PrescreenRequest):
    if not req.resume_focus_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is empty")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is empty")

    match_result = score_applicant(req.resume_focus_text, req.job_description)

    prescreen_result = summarize_prescreen(
        resume_focus_text=req.resume_focus_text,
        job_title=req.job_title,
        match_result=match_result,
    )

    return {"match": match_result, "prescreen": prescreen_result}
