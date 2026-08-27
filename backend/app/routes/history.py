from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.import_history import ImportHistory

router = APIRouter(prefix="/api/import-history", tags=["history"])

@router.get("")
def get_import_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the current user's upload history, newest first.
    """
    history = db.query(ImportHistory).filter(ImportHistory.user_id == current_user.id).order_by(ImportHistory.uploaded_at.desc()).all()
    return history
