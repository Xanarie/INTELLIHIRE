def has_description(job: dict) -> bool:
    """Returns True if the job has at least one description field filled in."""
    return any(
        (job.get(f) or "").strip()
        for f in (
            "key_responsibilities",
            "required_qualifications",
            "preferred_qualifications",
            "key_competencies",
        )
    )


def job_full_text(job: dict) -> str:
    """
    Combines all 4 job description sections into one text blob for AI matching.
    required_qualifications is included twice to boost its keyword weight.
    """
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