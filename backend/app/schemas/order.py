from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderResponse(BaseModel):
    id: int
    user_id: int
    reason_for_credit_entry: Optional[str] = None
    sub_order_no: Optional[str] = None
    catalog_id: Optional[str] = None
    order_date: Optional[datetime] = None
    order_source: Optional[str] = None
    customer_state: Optional[str] = None
    product_name: Optional[str] = None
    sku: Optional[str] = None
    size: Optional[str] = None
    quantity: Optional[int] = None
    supplier_listed_price: Optional[float] = None
    supplier_discounted_price: Optional[float] = None
    # Central COGS (from Product Costs), attached by GET /api/orders. These are
    # N/A (None / False) when the order's SKU has no configured cost — never zero.
    cost_per_unit: Optional[float] = None
    total_cost: Optional[float] = None
    has_cost: bool = False
    packet_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
