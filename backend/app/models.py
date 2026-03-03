from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import relationship

from .firebase_client import Base


class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(Integer, primary_key=True, index=True)
    f_name = Column(String(50), nullable=False)
    l_name = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(50))
    age = Column(Integer)
    gender = Column(String(50))
    current_city = Column(String(50))
    current_province = Column(String(50))
    home_address = Column(String(255))
    education = Column(String(50))
    app_source = Column(String(50))
    stable_internet = Column(String(50))
    isp = Column(String(50))
    applied_position = Column(String(50))
    resume_path = Column(String(255))
    hiring_status = Column(String(50), default="Pre-screening")

    # AI: Resume quality score (standalone)
    ai_resume_score = Column(Float, nullable=True)
    ai_resume_bucket = Column(String(50), nullable=True)
    ai_resume_score_json = Column(JSON, nullable=True)

    # AI: Job match score (requires job description)
    ai_job_match_score = Column(Float, nullable=True)
    ai_job_match_bucket = Column(String(50), nullable=True)
    ai_job_match_json = Column(JSON, nullable=True)

    # AI: Recruiter-facing prescreen summary
    ai_prescreening_summary = Column(Text, nullable=True)

    statuses = relationship(
        "ApplicantStatus",
        back_populates="applicant",
        cascade="all, delete-orphan",
    )


class ApplicantStatus(Base):
    __tablename__ = "applicant_statuses"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(50), nullable=False)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)

    applicant = relationship("Applicant", back_populates="statuses")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    status = Column(String(50), default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)
    applicant_limit = Column(Integer, default=50)

    # Structured job description — 4 sections
    key_responsibilities     = Column(Text, nullable=True)
    required_qualifications  = Column(Text, nullable=True)
    preferred_qualifications = Column(Text, nullable=True)
    key_competencies         = Column(Text, nullable=True)

    @property
    def full_job_text(self) -> str:
        """
        Combines all 4 sections into one text blob for AI matching.
        Required qualifications are included twice to boost their keyword weight.
        """
        parts = []
        if self.key_responsibilities:
            parts.append(f"Responsibilities:\n{self.key_responsibilities}")
        if self.required_qualifications:
            parts.append(f"Required Qualifications:\n{self.required_qualifications}")
            parts.append(f"Must Have:\n{self.required_qualifications}")
        if self.preferred_qualifications:
            parts.append(f"Preferred Qualifications:\n{self.preferred_qualifications}")
        if self.key_competencies:
            parts.append(f"Key Competencies:\n{self.key_competencies}")
        return "\n\n".join(parts)

    @property
    def has_description(self) -> bool:
        return bool(
            self.key_responsibilities
            or self.required_qualifications
            or self.preferred_qualifications
            or self.key_competencies
        )


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    dept = Column(String(255), default="General")