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
        return  # Already initialized, do nothing

    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if not cred_path:
        print("⚠️  WARNING: FIREBASE_CREDENTIALS_PATH is not set in .env - Firebase features will be disabled")
        return

    if not os.path.exists(cred_path):
        print(f"⚠️  WARNING: Firebase credentials file not found at {cred_path} - Firebase features will be disabled")
        return

    try:
        cred = credentials.Certificate(cred_path)

        # 🔹 Minimal change: check if app already exists
        if not firebase_admin._apps:
            _app = firebase_admin.initialize_app(cred)  # initialize only once
        else:
            _app = firebase_admin.get_app()  # reuse default app if already initialized

        _db = firestore.client()  # same as before, safe to call multiple times
        print("✅ Firebase initialized successfully")
    except Exception as e:
        print(f"⚠️  WARNING: Failed to initialize Firebase: {e}")
        print("Firebase features will be disabled")

def get_db():
    _init()
    if _db is None:
        raise RuntimeError("Firebase is not initialized. Please configure FIREBASE_CREDENTIALS_PATH in .env")
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