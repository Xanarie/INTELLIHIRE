import os
import cloudinary
import cloudinary.uploader

_configured = False


def _init():
    global _configured
    if _configured:
        return

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key    = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not all([cloud_name, api_key, api_secret]):
        raise RuntimeError(
            "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
        )

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    _configured = True


def upload_resume(file_bytes: bytes, original_filename: str) -> dict:
    """
    Uploads a resume to Cloudinary as a raw file.
    Returns {"download_url": ..., "public_id": ...}

    The download_url is a permanent HTTPS URL — no expiry, no signing needed.
    """
    _init()

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
        cloudinary.uploader.destroy(public_id, resource_type="raw")
    except Exception:
        pass