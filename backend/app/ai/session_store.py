# backend/app/ai/session_store.py
"""
Session storage for prescreen chat conversations.
Uses Firestore for persistence across server restarts and multiple instances.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.firebase_client import get_db
from app.ai.prescreen_chat import ConversationContext


COLLECTION_NAME = "chat_sessions"


def save_session(session_id: str, context: ConversationContext) -> None:
    """Save a chat session to Firestore."""
    try:
        db = get_db()
        session_data = {
            "session_id": session_id,
            "applicant_name": context.applicant_name,
            "position": context.position,
            "resume_text": context.resume_text,
            "job_description": context.job_description,
            "match_score": context.match_score,
            "conversation_history": context.conversation_history,
            "topics_covered": context.topics_covered,
            "questions_asked": context.questions_asked,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        db.collection(COLLECTION_NAME).document(session_id).set(session_data)
    except Exception as e:
        print(f"[SessionStore] Failed to save session {session_id}: {e}")


def load_session(session_id: str) -> Optional[ConversationContext]:
    """Load a chat session from Firestore."""
    try:
        db = get_db()
        doc = db.collection(COLLECTION_NAME).document(session_id).get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        
        # Reconstruct ConversationContext
        context = ConversationContext(
            applicant_name=data["applicant_name"],
            position=data["position"],
            resume_text=data["resume_text"],
            job_description=data["job_description"],
            match_score=data["match_score"],
        )
        
        # Restore state
        context.conversation_history = data.get("conversation_history", [])
        context.topics_covered = data.get("topics_covered", [])
        context.questions_asked = data.get("questions_asked", 0)
        
        return context
    except Exception as e:
        print(f"[SessionStore] Failed to load session {session_id}: {e}")
        return None


def delete_session(session_id: str) -> bool:
    """Delete a chat session from Firestore."""
    try:
        db = get_db()
        db.collection(COLLECTION_NAME).document(session_id).delete()
        return True
    except Exception as e:
        print(f"[SessionStore] Failed to delete session {session_id}: {e}")
        return False


def cleanup_old_sessions(days: int = 7) -> int:
    """Delete sessions older than specified days. Returns count deleted."""
    try:
        from datetime import timedelta
        db = get_db()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        old_sessions = (
            db.collection(COLLECTION_NAME)
            .where("updated_at", "<", cutoff)
            .limit(100)
            .get()
        )
        
        count = 0
        for doc in old_sessions:
            doc.reference.delete()
            count += 1
        
        if count > 0:
            print(f"[SessionStore] Cleaned up {count} old sessions")
        
        return count
    except Exception as e:
        print(f"[SessionStore] Failed to cleanup old sessions: {e}")
        return 0
