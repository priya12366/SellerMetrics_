from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from app.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    sub_order_no = Column(String(255), index=True, nullable=True)
    transaction_id = Column(String(255), index=True, nullable=True)
    payment_date = Column(DateTime, nullable=True)
    final_settlement_amount = Column(Numeric(10, 2), nullable=True)
    live_order_status = Column(String(255), nullable=True)
    product_name = Column(String(255), nullable=True)
    sku = Column(String(255), nullable=True)
    catalog_id = Column(String(255), nullable=True)
    quantity = Column(Integer, nullable=True)
    
    order_date = Column(DateTime, nullable=True)
    dispatch_date = Column(DateTime, nullable=True)
    order_source = Column(String(255), nullable=True)
    product_gst_percentage = Column(Numeric(5, 2), nullable=True)
    listing_price = Column(Numeric(10, 2), nullable=True)
    price_type = Column(String(255), nullable=True)
    total_sale_amount = Column(Numeric(10, 2), nullable=True)
    total_sale_return_amount = Column(Numeric(10, 2), nullable=True)
    fixed_fee = Column(Numeric(10, 2), nullable=True)
    warehousing_fee = Column(Numeric(10, 2), nullable=True)
    return_premium = Column(Numeric(10, 2), nullable=True)
    return_premium_return = Column(Numeric(10, 2), nullable=True)
    commission_percentage = Column(Numeric(5, 2), nullable=True)
    commission_amount = Column(Numeric(10, 2), nullable=True)
    gold_platform_fee = Column(Numeric(10, 2), nullable=True)
    mall_platform_fee = Column(Numeric(10, 2), nullable=True)
    return_shipping_charge = Column(Numeric(10, 2), nullable=True)
    gst_compensation = Column(Numeric(10, 2), nullable=True)
    shipping_charge = Column(Numeric(10, 2), nullable=True)
    other_support_service_charges = Column(Numeric(10, 2), nullable=True)
    waivers = Column(Numeric(10, 2), nullable=True)
    net_other_support_service_charges = Column(Numeric(10, 2), nullable=True)
    gst_on_support_service_charges = Column(Numeric(10, 2), nullable=True)
    tcs = Column(Numeric(10, 2), nullable=True)
    tds_rate = Column(Numeric(5, 2), nullable=True)
    tds = Column(Numeric(10, 2), nullable=True)
    compensation = Column(Numeric(10, 2), nullable=True)
    claims = Column(Numeric(10, 2), nullable=True)
    recovery = Column(Numeric(10, 2), nullable=True)
    compensation_reason = Column(String(255), nullable=True)
    claims_reason = Column(String(255), nullable=True)
    recovery_reason = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'sub_order_no', 'transaction_id', name='uq_user_sub_transaction'),
    )
