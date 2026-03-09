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

    # Local dev: use serviceAccountKey.json if it exists
    key_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
    if os.path.exists(key_path):
        cred = credentials.Certificate(os.path.normpath(key_path))
    else:
        # Production (Render): use individual env vars
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id":           os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id":       os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key":          os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
            "client_email":         os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id":            os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri":             "https://accounts.google.com/o/oauth2/auth",
            "token_uri":            "https://oauth2.googleapis.com/token",
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL"),
        })

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