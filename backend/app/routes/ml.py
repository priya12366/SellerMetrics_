from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.services.forecast_service import generate_forecast

router = APIRouter(prefix="/api/ml", tags=["machine_learning"])

@router.get("/forecast")
def get_ml_forecast(
    days: int = Query(7, description="Number of days to forecast. Allowed: 7 or 30."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates time-series forecasting for orders, revenue, settlement, and profit.
    """
    if days not in [7, 30]:
        raise HTTPException(status_code=400, detail="Invalid forecast days. Allowed values are 7 or 30.")
        
    try:
        result = generate_forecast(db, current_user.id, forecast_days=days)
        return result
    except Exception as e:
        # Avoid crashing completely, return a 500 cleanly
        raise HTTPException(status_code=500, detail=f"Unexpected error during ML forecasting: {str(e)}")
