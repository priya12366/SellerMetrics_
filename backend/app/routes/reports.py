from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.services.report_service import get_summary_report, get_matching_summary, get_unmatched_orders, get_unmatched_payments

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregated financial and processing metrics for the logged-in user.
    """
    return get_summary_report(db, current_user.id)

@router.get("/matching-summary")
def get_reports_matching_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns data quality and matching analytics for the logged-in user.
    """
    return get_matching_summary(db, current_user.id)

@router.get("/unmatched-orders")
def get_reports_unmatched_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns paginated unmatched orders for the logged-in user.
    """
    return get_unmatched_orders(db, current_user.id, skip, limit)

@router.get("/unmatched-payments")
def get_reports_unmatched_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns paginated unmatched payments for the logged-in user.
    """
    return get_unmatched_payments(db, current_user.id, skip, limit)
