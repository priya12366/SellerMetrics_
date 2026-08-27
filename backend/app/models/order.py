from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    reason_for_credit_entry = Column(String(255), nullable=True)
    sub_order_no = Column(String(255), nullable=True)
    catalog_id = Column(String(255), nullable=True)
    order_date = Column(DateTime, nullable=True)
    order_source = Column(String(255), nullable=True)
    customer_state = Column(String(255), nullable=True)
    product_name = Column(String(255), nullable=True)
    sku = Column(String(255), nullable=True)
    size = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=True)
    supplier_listed_price = Column(Float, nullable=True)
    supplier_discounted_price = Column(Float, nullable=True)
    packet_id = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'sub_order_no', name='uq_user_sub_order_no'),
    )
