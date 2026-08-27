import os
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "sellermetrics")
    
    # Safely URL-encode the username and password to handle special characters (e.g., @, #, !)
    _safe_user = urllib.parse.quote_plus(DB_USER)
    _safe_password = urllib.parse.quote_plus(DB_PASSWORD)
    
    # Construct the SQLAlchemy database URL
    DATABASE_URL: str = f"mysql+pymysql://{_safe_user}:{_safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

settings = Settings()
