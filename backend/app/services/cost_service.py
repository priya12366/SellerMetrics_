"""
cost_service.py
---------------
The SINGLE, shared definition of how a product SKU maps to its configured cost
(COGS). Every panel / endpoint that needs a per-SKU cost goes through this module
so they all agree on:
  * how a SKU string is normalised for matching, and
  * which ProductCost row a given order SKU resolves to.

Matching is trim + case-insensitive: "BIKE-COVER", "bike-cover" and " bike-cover "
are treated as the SAME product and share one cost. Genuinely different SKU
strings are never merged, so variants / pack-sizes / colours that carry distinct
SKUs keep their own separate cost.

The cost value itself lives in exactly one place — the product_costs table. This
module only READS it; it never mutates data.
"""
from decimal import Decimal
from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.models.product_cost import ProductCost


def normalize_sku(sku) -> Optional[str]:
    """
    Normalise a SKU for cost matching: strip surrounding whitespace and lower-case.
    Returns None for None/blank so a blank SKU never matches a configured cost.
    """
    if sku is None:
        return None
    normalized = str(sku).strip().lower()
    return normalized or None


def build_cost_map(db: Session, user_id: int) -> Dict[str, ProductCost]:
    """
    Build a { normalized_sku: ProductCost } map for one user from the central
    product_costs table in a single query. Used by every cost/profit calculation
    so they all resolve a SKU's cost identically.

    Returning the ProductCost row (not just the number) lets callers that need the
    configured product name reuse the same lookup. If two rows normalise to the
    same key, the later row wins — the upsert path prevents such duplicates.
    """
    cost_map: Dict[str, ProductCost] = {}
    rows = db.query(ProductCost).filter(ProductCost.user_id == user_id).all()
    for row in rows:
        key = normalize_sku(row.sku)
        if key is not None:
            cost_map[key] = row
    return cost_map


def cost_for_sku(cost_map: Dict[str, ProductCost], sku) -> Optional[Decimal]:
    """
    Return the configured cost_per_unit for an order's SKU using the normalised
    key, or None when the SKU is blank or has no configured cost (→ N/A).
    """
    key = normalize_sku(sku)
    if key is None:
        return None
    record = cost_map.get(key)
    return record.cost_per_unit if record is not None else None
