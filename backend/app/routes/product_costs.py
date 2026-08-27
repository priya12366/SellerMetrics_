from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.order import Order
from app.models.product_cost import ProductCost
from app.schemas.product_cost import ProductCostCreate, ProductCostUpdate, ProductCostResponse
from app.services.cost_service import normalize_sku, build_cost_map

router = APIRouter(prefix="/api/product-costs", tags=["product_costs"])

@router.get("/", response_model=List[ProductCostResponse])
def get_product_costs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all configured product costs for the current user.
    """
    return db.query(ProductCost).filter(ProductCost.user_id == current_user.id).all()

@router.get("/summary")
def get_product_cost_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a summary of all unique SKUs from orders and whether they have a cost configured.
    """
    # Central cost map: { normalized_sku: ProductCost } — the SAME lookup analytics
    # uses, so "is configured" here always agrees with the profit calculations.
    cost_map = build_cost_map(db, current_user.id)

    # Get all distinct SKUs and their product names from orders
    orders_data = db.query(
        Order.sku,
        func.max(Order.product_name).label('product_name')
    ).filter(
        Order.user_id == current_user.id,
        Order.sku.isnot(None)
    ).group_by(Order.sku).all()

    result = []
    seen_keys = set()
    for row in orders_data:
        sku = row.sku
        key = normalize_sku(sku)
        # Skip blank SKUs, and collapse case/space variants of one product into a
        # single row (distinct SKUs stay separate — variants are never merged).
        if key is None or key in seen_keys:
            continue
        seen_keys.add(key)

        cost_record = cost_map.get(key)
        result.append({
            "sku": sku,
            "product_name": row.product_name or (cost_record.product_name if cost_record else None),
            "cost_per_unit": cost_record.cost_per_unit if cost_record else None,
            "is_configured": cost_record is not None,
            "id": cost_record.id if cost_record else None
        })

    # Also add any configured costs that don't appear in orders yet.
    for key, cost_record in cost_map.items():
        if key in seen_keys:
            continue
        seen_keys.add(key)
        result.append({
            "sku": cost_record.sku,
            "product_name": cost_record.product_name,
            "cost_per_unit": cost_record.cost_per_unit,
            "is_configured": True,
            "id": cost_record.id
        })

    return result

@router.post("/", response_model=ProductCostResponse)
def upsert_product_cost(
    cost_in: ProductCostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create or update a product cost by SKU.
    """
    # Match an existing entry by the NORMALISED SKU (trim + case-insensitive), so
    # re-saving a case/space variant of the same SKU updates the one existing row
    # instead of creating a duplicate — the cost is entered once per real product.
    target_key = normalize_sku(cost_in.sku)
    existing = None
    if target_key is not None:
        for c in db.query(ProductCost).filter(ProductCost.user_id == current_user.id).all():
            if normalize_sku(c.sku) == target_key:
                existing = c
                break

    if existing:
        existing.cost_per_unit = cost_in.cost_per_unit
        if cost_in.product_name:
            existing.product_name = cost_in.product_name
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_cost = ProductCost(
            user_id=current_user.id,
            sku=cost_in.sku,
            product_name=cost_in.product_name,
            cost_per_unit=cost_in.cost_per_unit
        )
        db.add(new_cost)
        db.commit()
        db.refresh(new_cost)
        return new_cost

@router.put("/{cost_id}", response_model=ProductCostResponse)
def update_product_cost(
    cost_id: int,
    cost_update: ProductCostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a specific product cost by ID.
    """
    cost = db.query(ProductCost).filter(
        ProductCost.id == cost_id,
        ProductCost.user_id == current_user.id
    ).first()
    
    if not cost:
        raise HTTPException(status_code=404, detail="Product cost not found")
        
    cost.cost_per_unit = cost_update.cost_per_unit
    if cost_update.product_name is not None:
        cost.product_name = cost_update.product_name

    db.commit()
    db.refresh(cost)
    return cost

@router.delete("/{cost_id}", status_code=204)
def delete_product_cost(
    cost_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a configured product cost by ID. Only removes the ProductCost row
    (the seller's cost entry) — order/payment data is never touched.
    """
    cost = db.query(ProductCost).filter(
        ProductCost.id == cost_id,
        ProductCost.user_id == current_user.id
    ).first()

    if not cost:
        raise HTTPException(status_code=404, detail="Product cost not found")

    db.delete(cost)
    db.commit()
    return None
