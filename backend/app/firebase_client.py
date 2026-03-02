import os
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

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred_path:
        raise RuntimeError("FIREBASE_CREDENTIALS_PATH is not set in .env")

    cred  = credentials.Certificate(cred_path)
    _app  = firebase_admin.initialize_app(cred)
    _db   = firestore.client()


def get_db():
    _init()
    return _db


def doc_to_dict(doc) -> dict:
    """Converts a Firestore DocumentSnapshot → plain dict with 'id' as str."""
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data["id"] = doc.id
    # Convert Firestore Timestamps → ISO strings
    for k, v in data.items():
        if hasattr(v, "isoformat"):
            data[k] = v.isoformat()
    return data