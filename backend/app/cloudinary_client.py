# Handles all resume uploads/deletes via Cloudinary.
# Resumes are stored as raw files (PDF/DOCX) — no transformations needed.
#
# Required .env variables:
#   CLOUDINARY_CLOUD_NAME
#   CLOUDINARY_API_KEY
#   CLOUDINARY_API_SECRET

import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

_configured = False
_cloudinary_available = False


def _init():
    global _configured, _cloudinary_available
    if _configured:
        return

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key    = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not all([cloud_name, api_key, api_secret]):
        print("⚠️  WARNING: Cloudinary credentials not configured. Resume uploads will use placeholder URLs.")
        print("   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env to enable uploads.")
        _cloudinary_available = False
        _configured = True
        return

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    _cloudinary_available = True
    _configured = True
    print("✅ Cloudinary configured successfully")


def is_available() -> bool:
    """Check if Cloudinary is configured and available."""
    _init()
    return _cloudinary_available


def upload_resume(file_bytes: bytes, original_filename: str) -> dict:
    """
    Uploads a resume to Cloudinary as a raw file.
    Returns {"download_url": ..., "public_id": ...}

    The download_url is a permanent HTTPS URL — no expiry, no signing needed.
    
    If Cloudinary is not configured, returns a placeholder URL.
    """
    _init()
    
    if not _cloudinary_available:
        # Return placeholder for development
        return {
            "download_url": f"placeholder://resume/{original_filename}",
            "public_id": f"dev/{original_filename}",
        }

    # Strip extension for the public_id — Cloudinary adds it back
    base_name = original_filename.rsplit(".", 1)[0] if "." in original_filename else original_filename

    result = cloudinary.uploader.upload(
        file_bytes,
        resource_type="raw",          # raw = PDF/DOCX, not image/video
        folder="intellihire/resumes",
        use_filename=True,
        unique_filename=True,
        overwrite=False,
    )

    return {
        "download_url": result["secure_url"],
        "public_id":    result["public_id"],
    }


def delete_resume(public_id: str):
    """Deletes a resume from Cloudinary. Silent on missing file."""
    try:
        _init()
        if not _cloudinary_available:
            return  # Skip deletion in dev mode
        cloudinary.uploader.destroy(public_id, resource_type="raw")
    except Exception:
        pass