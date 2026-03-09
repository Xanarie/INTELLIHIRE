# backend/app/firebase_client.py
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

_app = None
_db  = None

def _init():
    global _app, _db
    if _app is not None:
        return

    key_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if not key_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_KEY env var is not set")

    cred = credentials.Certificate(json.loads(key_json))

    if not firebase_admin._apps:
        _app = firebase_admin.initialize_app(cred)
    else:
        _app = firebase_admin.get_app()

    _db = firestore.client()

def get_db():
    _init()
    return _db

def doc_to_dict(doc) -> dict:
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data["id"] = doc.id
    for k, v in data.items():
        if hasattr(v, "isoformat"):
            data[k] = v.isoformat()
    return data