from sqlalchemy import Boolean,Column,Integer,String,DateTime, Enum , func
from models import Base #database.py blueprint
import enum
import datetime


class SourceTypeEnum(enum.Enum): #metadata for object files
    PDF = "PDF"
    DOCX = "DOCX"

class Applicant(Base): # This correctly inherits from the Base defined above
    __tablename__ = 'applicants'

    applicant_id = Column(Integer, primary_key=True, unique=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    field = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    validated = Column(Boolean, default=False)
    source_type = Column(Enum(SourceTypeEnum), nullable=False)
    storage_key = Column(String(400), nullable=False, unique=True)