from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from app.database import Base

class ProductCost(Base):
    __tablename__ = "product_costs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    sku = Column(String(255), index=True, nullable=False)
    product_name = Column(String(255), nullable=True)
    cost_per_unit = Column(Numeric(10, 2), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'sku', name='uq_user_sku'),
    )
