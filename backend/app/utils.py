# backend/app/utils.py
# Shared utility functions to avoid code duplication

def job_full_text(job: dict) -> str:
    """Build full job description text from all fields."""
    parts = []
    if job.get("key_responsibilities"):
        parts.append(f"Responsibilities:\n{job['key_responsibilities']}")
    if job.get("required_qualifications"):
        parts.append(f"Required Qualifications:\n{job['required_qualifications']}")
        parts.append(f"Must Have:\n{job['required_qualifications']}")
    if job.get("preferred_qualifications"):
        parts.append(f"Preferred Qualifications:\n{job['preferred_qualifications']}")
    if job.get("key_competencies"):
        parts.append(f"Key Competencies:\n{job['key_competencies']}")
    return "\n\n".join(parts)


def has_job_description(job: dict) -> bool:
    """Check if job has any description fields filled."""
    return any(
        (job.get(f) or "").strip()
        for f in ("key_responsibilities", "required_qualifications",
                  "preferred_qualifications", "key_competencies")
    )


def applicant_full_name(data: dict) -> str:
    """Get applicant's full name from data dict."""
    return f"{data.get('f_name', '')} {data.get('l_name', '')}".strip() or "Unknown"
