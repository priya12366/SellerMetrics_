from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

class SettlementDetail(BaseModel):
    order_id: int
    sub_order_no: str
    order_date: Optional[datetime] = None
    payment_date: Optional[datetime] = None
    
    product_name: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    
    live_order_status: Optional[str] = None
    
    total_sale_amount: Optional[Decimal] = None
    total_sale_return_amount: Optional[Decimal] = None
    
    fixed_fee: Optional[Decimal] = None
    warehousing_fee: Optional[Decimal] = None
    return_premium: Optional[Decimal] = None
    return_premium_return: Optional[Decimal] = None
    
    commission_amount: Optional[Decimal] = None
    gold_platform_fee: Optional[Decimal] = None
    mall_platform_fee: Optional[Decimal] = None
    
    return_shipping_charge: Optional[Decimal] = None
    gst_compensation: Optional[Decimal] = None
    shipping_charge: Optional[Decimal] = None
    
    other_support_service_charges: Optional[Decimal] = None
    waivers: Optional[Decimal] = None
    net_other_support_service_charges: Optional[Decimal] = None
    gst_on_support_service_charges: Optional[Decimal] = None
    
    tcs: Optional[Decimal] = None
    tds: Optional[Decimal] = None
    
    compensation: Optional[Decimal] = None
    claims: Optional[Decimal] = None
    recovery: Optional[Decimal] = None
    
    final_settlement_amount: Optional[Decimal] = None

    class Config:
        from_attributes = True

class SettlementResponse(BaseModel):
    total: int
    settlements: List[SettlementDetail]
