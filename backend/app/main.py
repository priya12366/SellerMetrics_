from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from .database import get_db, engine, Base
from .models.user import User
from .models.order import Order
from .models.payment import Payment
from .models.import_history import ImportHistory
from .models.product_cost import ProductCost

from app.routes import (
    auth,
    orders,
    payments,
    reports,
    history,
    settlements,
    analytics,
    product_costs,
    ml,
)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SellerMetrics API",
    description="Backend for SellerMetrics E-commerce Analytics",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        # Production frontend
        "https://sellermetrics.onrender.com",

        # Local development
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],

    # Allow any localhost port during development
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(reports.router)
app.include_router(history.router)
app.include_router(settlements.router)
app.include_router(analytics.router)
app.include_router(product_costs.router)
app.include_router(ml.router)


@app.get("/")
def read_root():
    return {
        "message": "SellerMetrics Backend Running"
    }


@app.get("/database-status")
def database_status(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "connected",
            "database": "sellermetrics"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database connection failed: {str(e)}"
        )