from firebase_functions import https_fn
from app.main import app

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    """Cloud Function entry point for FastAPI app"""
    return app(req)
