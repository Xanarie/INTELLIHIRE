import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_app = None
_db  = None

def _init():
    global _app, _db
    if _app is not None:
        return

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

    if service_account_json:
        # Production (Vercel): credentials stored as JSON string in env var
        cred = credentials.Certificate(json.loads(service_account_json))
    elif cred_path:
        # Local development: credentials stored as a file path
        cred = credentials.Certificate(cred_path)
    else:
        raise RuntimeError(
            "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_CREDENTIALS_PATH."
        )

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