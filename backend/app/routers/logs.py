# backend/app/routers/logs.py
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query
from app.firebase_client import get_db, doc_to_dict

router = APIRouter(prefix="/api/admin/logs", tags=["Activity Logs"])


def write_log(
    action: str,
    entity_type: str,
    details: str,
    entity_id: Optional[str] = None,
    entity_name: Optional[str] = None,
    performed_by: str = "System",
):
    try:
        db = get_db()
        db.collection("activity_logs").add({
            "action":       action,
            "entity_type":  entity_type,
            "entity_id":    entity_id or "",
            "entity_name":  entity_name or "",
            "details":      details,
            "performed_by": performed_by,
            "timestamp":    datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        print(f"[logs] write_log failed silently: {e}")


@router.get("")
def get_logs(
    limit:       int           = Query(default=100, le=500),
    entity_type: Optional[str] = Query(default=None),
    action:      Optional[str] = Query(default=None),
):
    db   = get_db()
    docs = db.collection("activity_logs").order_by("timestamp", direction="DESCENDING").limit(500).get()
    logs = [{"id": d.id, **d.to_dict()} for d in docs]

    if entity_type:
        logs = [l for l in logs if l.get("entity_type") == entity_type]
    if action:
        logs = [l for l in logs if l.get("action") == action]

    return logs[:limit]


@router.delete("")
def clear_logs():
    db   = get_db()
    docs = db.collection("activity_logs").limit(500).get()
    for d in docs:
        d.reference.delete()
    return {"ok": True, "deleted": len(docs)}