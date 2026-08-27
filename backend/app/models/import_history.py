from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime
from app.database import Base

class ImportHistory(Base):
    __tablename__ = "import_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    reporting_period = Column(String(50), nullable=True)  # e.g. "August 2026"
    import_type = Column(String(50), nullable=False)      # "orders", "payments"
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    total_rows = Column(Integer, nullable=False, default=0)
    inserted_rows = Column(Integer, nullable=False, default=0)
    duplicate_rows = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False)           # "Uploaded", "Queued", "Processing", "Completed", "Failed"
    uploaded_at = Column(DateTime, default=datetime.utcnow)
