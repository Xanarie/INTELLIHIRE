from sqlalchemy import Column, Integer, String, DateTime, ForeignKey , Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


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

    statuses = relationship(
        "ApplicantStatus",
        back_populates="applicant",
        cascade="all, delete-orphan"
    )


class ApplicantInput(Base):   # ✅ RENAMED
    __tablename__ = "applicants_input"

    id = Column(Integer, primary_key=True, index=True)
    f_name = Column(String(50), nullable=False)
    l_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)


class ApplicantStatus(Base):
    __tablename__ = "applicant_statuses"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String(50), nullable=False)
    applicant_id = Column(Integer, ForeignKey("applicants.id"), nullable=False)

    applicant = relationship("Applicant", back_populates="statuses")

    from sqlalchemy import Text

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    # Update these two lines:
    title = Column(String(255), nullable=False) 
    department = Column(String(255), nullable=False)
    status = Column(String(50), default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)


class JobPost(Base):
    __tablename__ = "job_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    department = Column(String(100))
    description = Column(Text)
    requirements = Column(Text)
    status = Column(String(50), default="Open", nullable=False)
