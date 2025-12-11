from sqlalchemy import create_engine #connetion to mysql
from sqlalchemy.orm import sessionmaker #creates db sessions
from sqlalchemy.ext.declarative import declarative_base 

URL_DATABASE = 'mysql+pymysql://root:Mysqlserver1@localhost:3306/applicationmanagement' #db link

engine = create_engine(URL_DATABASE) #key

Sessionlocal = sessionmaker(autocommit= False, autoflush=False, bind=engine) #temporary nootepad

Base = declarative_base() # CORRECT HOME FOR BASE