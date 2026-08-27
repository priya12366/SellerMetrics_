from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal

class ProductCostBase(BaseModel):
    sku: str
    product_name: Optional[str] = None
    cost_per_unit: Decimal

class ProductCostCreate(ProductCostBase):
    pass

class ProductCostUpdate(BaseModel):
    cost_per_unit: Decimal
    product_name: Optional[str] = None

class ProductCostResponse(ProductCostBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
