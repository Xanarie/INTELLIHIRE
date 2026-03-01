# app/firebase.py
import os
import firebase_admin
from firebase_admin import credentials, firestore

_app = None
_db = None

def init_firebase():
    global _app, _db
    if _app is None:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not cred_path:
            raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS is not set")

        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db

def get_db():
    if _db is None:
        return init_firebase()
    return _db