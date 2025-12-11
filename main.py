from fastapi import FastAPI,HTTPException,Depends, status , UploadFile, File , Form
from pydantic import BaseModel
from typing import Annotated
import models 
from database import engine, Sessionlocal
from sqlalchemy.orm import Session
import shutil

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

#data validation from models.py base
class ApplicantCreate(BaseModel):
    name: str
    email: str
    field: str | None = None
    validated: bool = False
    source_type: models.SourceTypeEnum
    storage_key: str

#db session for every request
def get_db():
    db = Sessionlocal()
    try: 
        yield db
    finally:
        db.close()

db_dependency = Annotated[ Session , Depends(get_db)]

@app.delete("/applicants/{applicant_id}", status_code=status.HTTP_200_OK)
async def delete_applicant(applicant_id: int , db: db_dependency):
    applicant = db.query(models.Applicant).filter(models.Applicant.applicant_id == applicant_id).first()
    if applicant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail= 'Applicant not found')
    db.delete(applicant)
    db.commit()
    return {"message": f"Applicant with ID {applicant_id} successfully deleted."}

@app.post("/applicants/", status_code=status.HTTP_201_CREATED)
async def create_applicant(
    db: db_dependency ,
    pdf_file: UploadFile = File(...),
    name: str = Form(...),
    email: str = Form(...),
    field: str = Form(None),
    validated: bool = Form(False),
    ):

        storage_key = f"uploads/{pdf_file.filename}"

        if not storage_key.lower().endswith('.pdf'):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only Pdf files are allowed")
        
        file_path = storage_key
        
        try:
             with open(file_path , "wb") as buffer:
                 shutil.copyfileobj(pdf_file.file, buffer)
        except:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save files:{e}")
        
        db_applicant = models.Applicant(
            name = name,
            email = email,
            field = field,
            validated = validated,
            source_type=models.SourceTypeEnum.PDF, 
            storage_key=storage_key
        )

        db.add(db_applicant)
        db.commit()
        db.refresh(db_applicant)

        return db_applicant


@app.get("/applicants/{applicant_id}", status_code=status.HTTP_200_OK)
async def read_applicant(applicant_id: int, db: db_dependency):
    applicant = db.query(models.Applicant).filter(models.Applicant.applicant_id == applicant_id).first() #logic searching retrieval of
    if applicant is None:
        raise HTTPException(status_code= status.HTTP_404_NOT_FOUND , detail='Applicant not found')
    return applicant