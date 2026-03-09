from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List

from app.ai.matching import score_applicant
from app.ai.summarizer import summarize_prescreen
from app.ai.prescreen_chat import (
    start_conversation,
    process_response,
    ConversationContext,
)
from app.ai.session_store import save_session, load_session, delete_session

router = APIRouter()


class PrescreenRequest(BaseModel):
    resume_focus_text: str = Field(...)
    job_description: str = Field(...)
    job_title: Optional[str] = None


class PrescreenResponse(BaseModel):
    match: Dict[str, Any]
    prescreen: Dict[str, Any]


class ChatStartRequest(BaseModel):
    applicant_name: str = Field(...)
    position: str = Field(...)
    resume_text: str = Field(...)
    job_description: str = Field(...)
    match_score: float = Field(...)


class ChatStartResponse(BaseModel):
    session_id: str
    message: str
    conversation_history: List[Dict[str, Any]]


class ChatMessageRequest(BaseModel):
    session_id: str = Field(...)
    message: str = Field(...)


class ChatMessageResponse(BaseModel):
    message: str
    is_complete: bool
    conversation_history: List[Dict[str, Any]]
    summary: Optional[Dict[str, Any]] = None


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


@router.post("/prescreen-chat/start", response_model=ChatStartResponse)
def start_prescreen_chat(req: ChatStartRequest):
    """Start a new conversational pre-screening session."""
    import uuid
    
    if not req.applicant_name.strip():
        raise HTTPException(status_code=400, detail="Applicant name is required")
    if not req.position.strip():
        raise HTTPException(status_code=400, detail="Position is required")
    if not req.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required")
    if not req.job_description.strip():
        raise HTTPException(status_code=400, detail="Job description is required")
    
    # Create new conversation
    context, greeting = start_conversation(
        applicant_name=req.applicant_name,
        position=req.position,
        resume_text=req.resume_text,
        job_description=req.job_description,
        match_score=req.match_score,
    )
    
    # Generate session ID and store in Firestore
    session_id = str(uuid.uuid4())
    save_session(session_id, context)
    
    return {
        "session_id": session_id,
        "message": greeting,
        "conversation_history": context.conversation_history,
    }


@router.post("/prescreen-chat/message", response_model=ChatMessageResponse)
def send_chat_message(req: ChatMessageRequest):
    """Process a candidate's message and get the next question."""
    context = load_session(req.session_id)
    if not context:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Process the response
    updated_context, next_message, is_complete = process_response(context, req.message)
    save_session(req.session_id, updated_context)
    
    # Extract summary if complete
    summary = None
    if is_complete and updated_context.conversation_history:
        last_msg = updated_context.conversation_history[-1]
        if "summary" in last_msg:
            summary = last_msg["summary"]
    
    return {
        "message": next_message,
        "is_complete": is_complete,
        "conversation_history": updated_context.conversation_history,
        "summary": summary,
    }


@router.get("/prescreen-chat/session/{session_id}")
def get_chat_session(session_id: str):
    """Retrieve a chat session's conversation history."""
    context = load_session(session_id)
    if not context:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    return {
        "session_id": session_id,
        "applicant_name": context.applicant_name,
        "position": context.position,
        "match_score": context.match_score,
        "conversation_history": context.conversation_history,
        "topics_covered": context.topics_covered,
        "questions_asked": context.questions_asked,
    }


@router.delete("/prescreen-chat/session/{session_id}")
def delete_chat_session(session_id: str):
    """Delete a chat session."""
    if delete_session(session_id):
        return {"message": "Session deleted successfully"}
    raise HTTPException(status_code=404, detail="Session not found")
