from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.auth import get_current_user
from app.models.user import User
from app.services.report_service import (
    get_matching_summary,
    get_unmatched_orders,
    get_unmatched_payments
)
from app.models.payment import Payment
from app.models.order import Order
from app.services.cost_service import build_cost_map, cost_for_sku, normalize_sku
from app.services.deduction_service import (
    DEDUCTION_COLUMNS,
    build_deduction_breakdown,
)
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/matching-summary")
def get_analytics_matching_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns data quality and matching analytics formatted for the frontend overview.
    """
    # Use existing report service function which calculates everything needed
    data = get_matching_summary(db, current_user.id)

    # Map the nested response to the requested flat structure
    return {
        "total_orders": data["orders"]["total_rows"],
        "total_payment_rows": data["payments"]["total_rows"],
        "matched_orders": data["matching"]["matched_orders"],
        "unmatched_orders": data["matching"]["unmatched_orders"],
        "unmatched_payments": data["matching"]["unmatched_payment_rows"],
        "match_rate": data["matching"]["match_rate"],
        "duplicate_orders": data["data_quality"]["duplicate_order_rows"],
        "duplicate_payments": data["data_quality"]["duplicate_payment_rows"]
    }

@router.get("/unmatched-orders")
def get_analytics_unmatched_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns paginated unmatched orders for the logged-in user.
    """
    return get_unmatched_orders(db, current_user.id, skip, limit)

@router.get("/unmatched-payments")
def get_analytics_unmatched_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns paginated unmatched payments for the logged-in user.
    """
    return get_unmatched_payments(db, current_user.id, skip, limit)

@router.get("/profit-summary")
def get_analytics_profit_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns profit and loss analytics for the authenticated user.
    """
    # Central COGS lookup (single source of truth), shared by every panel.
    cost_map = build_cost_map(db, current_user.id)

    # Get all matching orders and payments
    matched_data = db.query(
        Order, Payment
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id
    ).all()

    total_settlement = 0.0
    total_product_cost = 0.0
    estimated_gross_profit = 0.0

    products_with_cost = set()
    products_without_cost = set()

    for order, payment in matched_data:
        settlement = float(payment.final_settlement_amount or 0)
        total_settlement += settlement

        # Resolve this SKU's cost via the shared trim + case-insensitive lookup.
        unit_cost = cost_for_sku(cost_map, order.sku)

        # Track configured vs missing costs per SKU (normalised key)
        if order.sku:
            sku_key = normalize_sku(order.sku)
            if unit_cost is not None:
                products_with_cost.add(sku_key)
                cost_per_unit = float(unit_cost)
            else:
                products_without_cost.add(sku_key)
                cost_per_unit = 0.0

            qty = order.quantity or 1
            row_cost = cost_per_unit * qty

            total_product_cost += row_cost
            estimated_gross_profit += (settlement - row_cost)

    # COGS is only fully known when every matched SKU has a configured cost.
    # If any contributing SKU is missing its Cost Per Unit (or none are configured
    # at all), the aggregate cost/profit/margin cannot be trusted, so we return
    # null (N/A) instead of a fake zero-cost profit — honouring the COGS = N/A rule.
    cogs_complete = len(products_with_cost) > 0 and len(products_without_cost) == 0

    if cogs_complete:
        profit_margin = 0.0
        if total_settlement > 0:
            profit_margin = round((estimated_gross_profit / total_settlement) * 100, 2)
        result_product_cost = round(total_product_cost, 2)
        result_gross_profit = round(estimated_gross_profit, 2)
        result_profit_margin = profit_margin
    else:
        result_product_cost = None
        result_gross_profit = None
        result_profit_margin = None

    return {
        "total_settlement": round(total_settlement, 2),
        "total_product_cost": result_product_cost,
        "estimated_gross_profit": result_gross_profit,
        "profit_margin": result_profit_margin,
        "products_with_cost": len(products_with_cost),
        "products_without_cost": len(products_without_cost)
    }

@router.get("/product-profitability")
def get_analytics_product_profitability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns product-level profitability analytics.
    """
    cost_map = build_cost_map(db, current_user.id)

    matched_data = db.query(
        Order, Payment
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id
    ).all()

    product_stats = {}

    for order, payment in matched_data:
        # Group by the normalised SKU so one real product = one row (case/space
        # variants of the same SKU collapse together, distinct SKUs stay separate),
        # while keeping the original SKU/name for display.
        sku_key = normalize_sku(order.sku) or "unknown"
        display_sku = order.sku or "UNKNOWN"
        product_name = order.product_name or "Unknown Product"
        unit_cost = cost_for_sku(cost_map, order.sku)

        if sku_key not in product_stats:
            product_stats[sku_key] = {
                "sku": display_sku,
                "product_name": product_name,
                "orders": 0,
                "units_sold": 0,
                "settlement": 0.0,
                "product_cost": 0.0,
                "estimated_profit": 0.0,
                "has_cost": unit_cost is not None
            }

        stats = product_stats[sku_key]
        stats["orders"] += 1

        qty = order.quantity or 1
        stats["units_sold"] += qty

        settlement = float(payment.final_settlement_amount or 0)
        stats["settlement"] += settlement

        if unit_cost is not None:
            row_cost = float(unit_cost) * qty
            stats["has_cost"] = True
        else:
            row_cost = 0.0

        stats["product_cost"] += row_cost
        stats["estimated_profit"] += (settlement - row_cost)

    # Format the response. When a product has no configured cost, cost / profit /
    # margin are reported as N/A (null) rather than a fake zero-cost (~100% margin)
    # profit — the frontend already renders these rows as "Cost Required".
    results = []
    for sku_key, stats in product_stats.items():
        if stats["has_cost"]:
            margin = 0.0
            if stats["settlement"] > 0:
                margin = round((stats["estimated_profit"] / stats["settlement"]) * 100, 2)
            result_cost = round(stats["product_cost"], 2)
            result_profit = round(stats["estimated_profit"], 2)
            result_margin = margin
        else:
            result_cost = None
            result_profit = None
            result_margin = None

        results.append({
            "sku": stats["sku"],
            "product_name": stats["product_name"],
            "orders": stats["orders"],
            "units_sold": stats["units_sold"],
            "settlement": round(stats["settlement"], 2),
            "product_cost": result_cost,
            "estimated_profit": result_profit,
            "profit_margin": result_margin,
            "has_cost": stats["has_cost"]
        })

    return sorted(results, key=lambda x: (not x["has_cost"], x["estimated_profit"] or 0))


@router.get("/historical-trend")
def get_analytics_historical_trend(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns daily orders and settlement totals for the given date range.
    """
    latest_order = db.query(func.max(Order.order_date)).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id
    ).scalar()

    end_date = latest_order or datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    matched_data = db.query(
        Order.order_date,
        Payment.final_settlement_amount
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id,
        Order.order_date >= start_date,
        Order.order_date <= end_date
    ).all()

    daily_stats = {}
    for row in matched_data:
        dt_key = row.order_date
        if not dt_key:
            continue

        dt_str = dt_key.strftime("%Y-%m-%d") if hasattr(dt_key, 'strftime') else str(dt_key)

        if dt_str not in daily_stats:
            daily_stats[dt_str] = {
                "date": dt_str,
                "orders": 0,
                "settlement": 0.0
            }

        stats = daily_stats[dt_str]
        stats["orders"] += 1
        stats["settlement"] += float(row.final_settlement_amount or 0)

    # Convert to sorted list
    results = sorted(list(daily_stats.values()), key=lambda x: x["date"])
    return results

@router.get("/monthly-summary")
def get_analytics_monthly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns monthly aggregated orders, sales, and profit.
    """
    cost_map = build_cost_map(db, current_user.id)

    matched_data = db.query(
        Order, Payment
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id
    ).all()

    monthly_stats = {}

    for order, payment in matched_data:
        dt_key = order.order_date or payment.payment_date
        if not dt_key:
            continue

        month_key = dt_key.strftime("%B %Y")
        sort_key = dt_key.strftime("%Y-%m")

        if month_key not in monthly_stats:
            monthly_stats[month_key] = {
                "month": month_key,
                "sort_key": sort_key,
                "orders": 0,
                "gross_sales": 0.0,
                "settlement": 0.0,
                "returns": 0,
                "rto": 0,
                "profit": 0.0,
                "skus_with_cost": set(),
                "skus_without_cost": set()
            }

        stats = monthly_stats[month_key]
        stats["orders"] += 1

        gross_sale = float(payment.total_sale_amount or 0)
        settlement = float(payment.final_settlement_amount or 0)

        stats["gross_sales"] += gross_sale
        stats["settlement"] += settlement

        status = payment.live_order_status
        if status == 'Return':
            stats["returns"] += 1
        elif status == 'RTO':
            stats["rto"] += 1

        qty = order.quantity or 1
        # Resolve the SKU's cost via the shared central lookup, and track whether
        # each contributing SKU has a configured cost (normalised key), so we can
        # tell if this month's COGS is fully known (mirrors the profit-summary rule).
        unit_cost = cost_for_sku(cost_map, order.sku)
        if order.sku:
            sku_key = normalize_sku(order.sku)
            if unit_cost is not None:
                stats["skus_with_cost"].add(sku_key)
            else:
                stats["skus_without_cost"].add(sku_key)

        if unit_cost is not None:
            row_cost = float(unit_cost) * qty
        else:
            row_cost = 0.0

        stats["profit"] += (settlement - row_cost)

    results = []
    for m in sorted(monthly_stats.values(), key=lambda x: x["sort_key"], reverse=True):
        # COGS for the month is only trustworthy when every contributing SKU has a
        # configured cost. Otherwise profit/margin are N/A (null) rather than a fake
        # zero-cost figure that would just mirror settlement.
        cogs_complete = len(m["skus_with_cost"]) > 0 and len(m["skus_without_cost"]) == 0

        if cogs_complete:
            margin = 0.0
            if m["gross_sales"] > 0:
                margin = round((m["profit"] / m["gross_sales"]) * 100, 2)
            result_profit = round(m["profit"], 2)
            result_margin = margin
        else:
            result_profit = None
            result_margin = None

        results.append({
            "month": m["month"],
            "orders": m["orders"],
            "gross_sales": round(m["gross_sales"], 2),
            "settlement": round(m["settlement"], 2),
            "returns": m["returns"],
            "rto": m["rto"],
            "profit": result_profit,
            "margin": result_margin
        })

    return results


@router.get("/available-periods")
def get_available_periods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns available years and months from the matched data for the user.
    """
    # Just query orders for this user that have an order_date
    orders = db.query(Order.order_date).filter(
        Order.user_id == current_user.id,
        Order.order_date != None
    ).all()

    years_dict = {}
    for (odate,) in orders:
        if not odate: continue
        y = odate.year
        m = odate.month

        if y not in years_dict:
            years_dict[y] = set()
        years_dict[y].add(m)

    results = []
    for y in sorted(years_dict.keys(), reverse=True):
        results.append({
            "year": y,
            "months": sorted(list(years_dict[y]))
        })
    return results

@router.get("/period-analysis")
def get_period_analysis(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns detailed analysis for ONE specific month/year.

    IMPORTANT: every metric below is computed ONLY from records whose ORDER
    date falls inside the selected year+month. Lifetime totals are never used.
    Sales/settlement/fees come from the matched payment rows, so the numbers
    stay consistent with the Dashboard "Monthly View".
    """
    # Central COGS lookup (single source of truth), shared by every panel.
    cost_map = build_cost_map(db, current_user.id)

    # Pull matched order+payment rows for the user.
    matched_data = db.query(
        Order, Payment
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id
    ).all()

    # Keep ONLY the rows that belong to the selected period (by order date).
    period_data = []
    for o, p in matched_data:
        if o.order_date and o.order_date.year == year and o.order_date.month == month:
            period_data.append((o, p))

    # ---- Aggregate period-level metrics ----
    total_sales = 0.0
    total_orders = len(period_data)
    total_settlement = 0.0
    total_returns = 0
    total_rto = 0
    total_fees = 0.0
    total_cogs = 0.0

    # Per-category deduction sums (each is a direct sum of a real report column).
    deduction_sums = {col: 0.0 for col, _ in DEDUCTION_COLUMNS}

    period_skus_with_cost = set()
    period_skus_without_cost = set()

    sku_stats = {}

    for o, p in period_data:
        sales = float(p.total_sale_amount or 0)
        settlement = float(p.final_settlement_amount or 0)

        total_sales += sales
        total_settlement += settlement

        # Sum the platform fee / deduction columns that actually exist in the report.
        fees = (
            float(p.fixed_fee or 0) +
            float(p.warehousing_fee or 0) +
            float(p.commission_amount or 0) +
            float(p.shipping_charge or 0) +
            float(p.return_shipping_charge or 0) +
            float(p.mall_platform_fee or 0) +
            float(p.gold_platform_fee or 0)
        )
        total_fees += fees

        # Accumulate every real deduction/adjustment column for this period so we
        # can show a source-backed, itemised breakdown (no derived/assumed values).
        for col in deduction_sums:
            deduction_sums[col] += float(getattr(p, col) or 0)

        status = p.live_order_status
        if status == 'Return':
            total_returns += 1
        elif status == 'RTO':
            total_rto += 1

        qty = o.quantity or 1

        # COGS is only known when the seller has configured a cost for this SKU,
        # resolved via the shared trim + case-insensitive central lookup.
        sku_key = normalize_sku(o.sku)
        cost_record = cost_map.get(sku_key) if sku_key else None
        has_cost = cost_record is not None
        cogs = float(cost_record.cost_per_unit) * qty if has_cost else 0.0
        if has_cost:
            total_cogs += cogs

        # Track configured vs missing costs (normalised key) so the period's overall
        # profit/margin can be reported as N/A when COGS is incomplete (same rule as elsewhere).
        if o.sku:
            if has_cost:
                period_skus_with_cost.add(sku_key)
            else:
                period_skus_without_cost.add(sku_key)

        # ---- Per-SKU aggregation (grouped by normalised SKU so one real product = one
        # row; distinct SKUs stay separate. Built ONLY from this period's records) ----
        sku = sku_key or "unknown"
        display_sku = o.sku or "UNKNOWN"
        product_name = o.product_name or (cost_record.product_name if cost_record else None) or "Unknown Product"

        if sku not in sku_stats:
            sku_stats[sku] = {
                "sku": display_sku,
                "product_name": product_name,
                "orders": 0,
                "units_sold": 0,
                "sales": 0.0,
                "settlement": 0.0,
                "cogs": 0.0,
                "profit": 0.0,
                "returns": 0,
                "rto": 0,
                "has_cost": True,
            }

        s = sku_stats[sku]
        s["orders"] += 1
        s["units_sold"] += qty
        s["sales"] += sales
        s["settlement"] += settlement

        if status == 'Return':
            s["returns"] += 1
        elif status == 'RTO':
            s["rto"] += 1

        if has_cost:
            s["cogs"] += cogs
            s["profit"] += (settlement - cogs)
        else:
            # No cost configured for this SKU -> COGS/profit cannot be computed.
            s["has_cost"] = False

    # Overall profit is only meaningful when COGS is fully known for the period.
    # If any contributing SKU is missing its configured cost (or none are configured),
    # report gross profit / margin as N/A (null) instead of a fake settlement-as-profit.
    period_cogs_complete = len(period_skus_with_cost) > 0 and len(period_skus_without_cost) == 0
    if period_cogs_complete:
        gross_profit = round(total_settlement - total_cogs, 2)
        profit_margin = 0.0
        if total_sales > 0:
            profit_margin = round(((total_settlement - total_cogs) / total_sales) * 100, 2)
    else:
        gross_profit = None
        profit_margin = None

    return_rate = round((total_returns / total_orders) * 100, 2) if total_orders > 0 else 0.0
    rto_rate = round((total_rto / total_orders) * 100, 2) if total_orders > 0 else 0.0

    # Amount of gross sales that never reached the seller as settlement.
    settlement_difference = round(total_sales - total_settlement, 2)

    # ---- Source-backed deduction breakdown (shared single source of truth) ----
    # Each line is a direct sum of a real payment-report column for this period,
    # reconciling Gross Sales -> Settlement Received. Built by the shared helper
    # (app.services.deduction_service) so Reports and the Dashboard surface the
    # exact same categories from the exact same logic.
    deduction_breakdown = build_deduction_breakdown(deduction_sums, total_sales, total_settlement)

    # ---- Build the per-product list ----
    product_performance = []
    for s in sku_stats.values():
        pmargin = 0.0
        if s["has_cost"] and s["sales"] > 0:
            pmargin = round((s["profit"] / s["sales"]) * 100, 2)

        product_performance.append({
            "sku": s["sku"],
            "product_name": s["product_name"],
            "orders": s["orders"],
            "units_sold": s["units_sold"],
            "sales": round(s["sales"], 2),
            "settlement": round(s["settlement"], 2),
            "cogs": round(s["cogs"], 2) if s["has_cost"] else None,
            "profit": round(s["profit"], 2) if s["has_cost"] else None,
            "margin": pmargin if s["has_cost"] else None,
            "returns": s["returns"],
            "rto": s["rto"],
            "has_cost": s["has_cost"],
        })

    # ---- Best / worst highlights (only when the data actually supports them) ----
    most_profitable = None
    highest_loss = None
    highest_selling = None
    highest_orders = None
    highest_rto = None
    highest_return = None

    if product_performance:
        with_cost = [p for p in product_performance if p["has_cost"]]
        if with_cost:
            most_profitable = max(with_cost, key=lambda x: x["profit"])
            highest_loss = min(with_cost, key=lambda x: x["profit"])

        highest_selling = max(product_performance, key=lambda x: x["sales"])
        highest_orders = max(product_performance, key=lambda x: x["orders"])

        rto_list = [p for p in product_performance if p["rto"] > 0]
        if rto_list:
            highest_rto = max(rto_list, key=lambda x: x["rto"])

        ret_list = [p for p in product_performance if p["returns"] > 0]
        if ret_list:
            highest_return = max(ret_list, key=lambda x: x["returns"])

    return {
        "period": {
            "year": year,
            "month": month,
            "label": datetime(year, month, 1).strftime("%B %Y"),
        },
        "overall": {
            "total_sales": round(total_sales, 2),
            "total_orders": total_orders,
            "settlement_amount": round(total_settlement, 2),
            "returns": total_returns,
            "rto": total_rto,
            "total_fees": round(total_fees, 2),
            "total_cogs": round(total_cogs, 2) if total_cogs > 0 else None,
            "gross_profit": gross_profit,
            "profit_margin": profit_margin,
            "return_rate": return_rate,
            "rto_rate": rto_rate,
            "settlement_difference": settlement_difference,
            "deduction_breakdown": deduction_breakdown,
        },
        "product_performance": sorted(product_performance, key=lambda x: x["sales"], reverse=True),
        "highlights": {
            "most_profitable": most_profitable,
            "highest_loss": highest_loss,
            "highest_selling": highest_selling,
            "highest_orders": highest_orders,
            "highest_rto": highest_rto,
            "highest_return": highest_return,
        }
    }


@router.get("/returns-rto-analysis")
def get_returns_rto_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    All-time PRODUCT-WISE Returns and RTO analysis, grouped by SKU.

    Customer Returns and RTO are kept STRICTLY SEPARATE here — they are two
    independent counts and are NEVER summed into one number. The distinction
    comes from the authoritative payment field `live_order_status`, exactly as
    every other analytics panel already defines it:
        live_order_status == 'Return'  -> a customer return
        live_order_status == 'RTO'     -> a return-to-origin
    Any other value (Delivered / Shipped / Cancelled / blank) is neither, and
    is never counted as a return or an RTO.

    Per product / SKU:
        total_orders = every order for that SKU (from the orders table, grouped
                       by the shared normalised SKU so one real product = one
                       row; distinct SKU strings are never merged).
        returns      = orders whose matched payment status is 'Return'.
        rto          = orders whose matched payment status is 'RTO'.
        return_rate  = returns / total_orders * 100
        rto_rate     = rto     / total_orders * 100

    Return / RTO status only exists on matched payment rows, so an order with no
    matched payment simply has an unknown outcome: it is counted in total_orders
    but never invented as a return or an RTO (no fake data). Each order is
    classified at most once, so returns + rto can never exceed total_orders and
    no order is double-counted across the two categories.
    """
    # --- 1. Collapse to ONE status per order: sub_order_no -> status -------
    # A sub-order can (rarely) have more than one payment row; reduce to a
    # single status per order so an order is never counted twice. A genuine
    # Return/RTO status, once seen, is kept, so it can't be hidden by another
    # payment row for the same order.
    status_rows = db.query(
        Payment.sub_order_no, Payment.live_order_status
    ).filter(
        Payment.user_id == current_user.id,
        Payment.sub_order_no.isnot(None),
    ).all()

    order_status = {}
    for sub_order_no, status in status_rows:
        if not sub_order_no:
            continue
        if order_status.get(sub_order_no) in ('Return', 'RTO'):
            continue
        order_status[sub_order_no] = status

    # --- 2. Aggregate every order by normalised SKU -----------------------
    orders = db.query(
        Order.sub_order_no, Order.sku, Order.product_name
    ).filter(
        Order.user_id == current_user.id
    ).all()

    sku_stats = {}
    for sub_order_no, sku, product_name in orders:
        key = normalize_sku(sku) or "unknown"
        stat = sku_stats.get(key)
        if stat is None:
            stat = {
                "sku": sku or "UNKNOWN",
                "product_name": product_name or "Unknown Product",
                "total_orders": 0,
                "returns": 0,
                "rto": 0,
            }
            sku_stats[key] = stat

        # Keep the first real product name we see for this SKU.
        if stat["product_name"] in (None, "Unknown Product") and product_name:
            stat["product_name"] = product_name

        stat["total_orders"] += 1

        status = order_status.get(sub_order_no)
        if status == 'Return':
            stat["returns"] += 1
        elif status == 'RTO':
            stat["rto"] += 1

    # --- 3. Build per-product rows with SEPARATE return & RTO rates --------
    products = []
    total_orders_all = 0
    total_returns_all = 0
    total_rto_all = 0
    for stat in sku_stats.values():
        total = stat["total_orders"]
        returns = stat["returns"]
        rto = stat["rto"]
        products.append({
            "sku": stat["sku"],
            "product_name": stat["product_name"],
            "total_orders": total,
            "returns": returns,
            "return_rate": round((returns / total) * 100, 2) if total > 0 else 0.0,
            "rto": rto,
            "rto_rate": round((rto / total) * 100, 2) if total > 0 else 0.0,
        })
        total_orders_all += total
        total_returns_all += returns
        total_rto_all += rto

    # Neutral default ordering: biggest products first (matches Product
    # Performance). The frontend re-sorts each card by its own metric.
    products.sort(key=lambda p: p["total_orders"], reverse=True)

    # --- 4. Highest-return and highest-RTO products (kept separate) -------
    # Surfaced only when at least one real Return / RTO exists, so we never
    # highlight a "worst" product that actually has none.
    ret_candidates = [p for p in products if p["returns"] > 0]
    rto_candidates = [p for p in products if p["rto"] > 0]
    highest_return_product = max(ret_candidates, key=lambda p: p["returns"]) if ret_candidates else None
    highest_rto_product = max(rto_candidates, key=lambda p: p["rto"]) if rto_candidates else None

    return {
        "products": products,
        "highest_return_product": highest_return_product,
        "highest_rto_product": highest_rto_product,
        "totals": {
            "total_orders": total_orders_all,
            "total_returns": total_returns_all,
            "total_rto": total_rto_all,
            "overall_return_rate": round((total_returns_all / total_orders_all) * 100, 2) if total_orders_all > 0 else 0.0,
            "overall_rto_rate": round((total_rto_all / total_orders_all) * 100, 2) if total_orders_all > 0 else 0.0,
        },
    }


def _build_loss_reason(loss_amount, settlement, product_cost, total_orders,
                       delivered, returns, rto, other, settlement_returns_rto):
    """
    Build a plain-language, data-ONLY explanation of a single product's loss.

    Discipline (matches the seller-facing requirements):
      * The always-true arithmetic cause is stated plainly: a loss exists only
        because the settlement received is below the product cost (COGS).
      * Delivered / customer-return / RTO counts are reported as facts. Returns
        and RTO are kept strictly separate and are NEVER assumed to be THE cause.
      * When the order outcomes are missing from the data, we explicitly say the
        reason cannot be determined from available data — we do not guess.
    """
    rupee = "₹"  # ₹ written as an escape — safe across source-file encodings
    known = delivered + returns + rto  # orders with a meaningful outcome

    base = (
        f"This product lost {rupee}{loss_amount:.2f} because the settlement received "
        f"({rupee}{settlement:.2f}) is lower than its product cost / COGS "
        f"({rupee}{product_cost:.2f})."
    )

    parts = [f"{delivered} delivered", f"{returns} customer return(s)", f"{rto} RTO"]
    if other:
        parts.append(f"{other} other/unknown status")
    composition = (
        f" Based on {total_orders} order(s) with settlement records: "
        + ", ".join(parts) + "."
    )

    if total_orders > 0 and known == 0:
        # Every contributing order has an unknown status (blank / Cancelled /
        # Shipped) — the arithmetic reason holds, but the underlying cause does not.
        qualifier = (
            " The delivery status of these orders is not available, so the exact "
            "reason cannot be determined from available data."
        )
    elif (returns + rto) == 0:
        qualifier = (
            " None of these orders were returned or RTO, so the loss is not caused "
            "by returns — the settlement earned per sale is simply lower than "
            "the cost."
        )
    else:
        # There ARE returned/RTO orders. State, factually, what settlement they
        # brought in (which can be negative once fees/charges are applied) without
        # over-claiming that they are the sole cause of the loss.
        if settlement_returns_rto < 0:
            rr_money = (
                f"led to a net settlement deduction of {rupee}"
                f"{abs(settlement_returns_rto):.2f} after fees/charges"
            )
        else:
            rr_money = f"brought in only {rupee}{settlement_returns_rto:.2f} in settlement"

        if delivered == 0:
            qualifier = (
                f" All {total_orders} order(s) were returned or RTO and {rr_money}, "
                "while the product cost still applies."
            )
        else:
            qualifier = (
                f" The {returns + rto} returned/RTO order(s) {rr_money} while still "
                "incurring product cost, which contributed to the loss."
            )

    return base + composition + qualifier


@router.get("/loss-reasons")
def get_loss_reasons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Explains WHY each loss-making product is losing money, using only real data.

    "Loss-making" uses EXACTLY the definition the Profitability page already uses:
    a product has a configured cost (COGS) AND its estimated profit
    (settlement - COGS) is below zero. Settlement, cost and profit are computed
    identically to /product-profitability, so this endpoint's loss set matches
    that endpoint's output one-to-one.

    For every loss-making SKU we additionally report the order composition using
    the SAME authoritative status field as every other panel
    (payments.live_order_status): Delivered / Return / RTO / other. Customer
    Returns and RTO are counted SEPARATELY and never summed together.

    All figures come from orders that have a matched settlement record (the only
    orders that contribute settlement and cost, i.e. the ones that actually
    produce the loss). Each DISTINCT order is classified once — a sub-order with
    more than one payment row is not double-counted — so
    delivered + returns + rto + other always equals total_orders.
    """
    cost_map = build_cost_map(db, current_user.id)

    # One status per order (a genuine Return/RTO, once seen, is kept) — identical
    # to the returns-rto-analysis endpoint so the definitions stay in lock-step.
    order_status = {}
    for sub_order_no, status in db.query(
        Payment.sub_order_no, Payment.live_order_status
    ).filter(
        Payment.user_id == current_user.id,
        Payment.sub_order_no.isnot(None),
    ).all():
        if not sub_order_no:
            continue
        if order_status.get(sub_order_no) in ('Return', 'RTO'):
            continue
        order_status[sub_order_no] = status

    # Same matched (order, payment) universe as /product-profitability.
    matched_data = db.query(
        Order, Payment
    ).join(
        Payment, and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == current_user.id
    ).all()

    stats = {}
    for order, payment in matched_data:
        sku_key = normalize_sku(order.sku) or "unknown"
        s = stats.get(sku_key)
        if s is None:
            s = {
                "sku": order.sku or "UNKNOWN",
                "product_name": order.product_name or "Unknown Product",
                "settlement": 0.0,
                "product_cost": 0.0,
                "has_cost": False,
                "seen_orders": set(),
                "total_orders": 0,
                "delivered": 0,
                "returns": 0,
                "rto": 0,
                "other": 0,
                "settlement_returns_rto": 0.0,
            }
            stats[sku_key] = s

        if s["product_name"] in (None, "Unknown Product") and order.product_name:
            s["product_name"] = order.product_name

        # Settlement + COGS mirror /product-profitability exactly (unchanged calc).
        row_settlement = float(payment.final_settlement_amount or 0)
        s["settlement"] += row_settlement
        unit_cost = cost_for_sku(cost_map, order.sku)
        if unit_cost is not None:
            s["has_cost"] = True
            s["product_cost"] += float(unit_cost) * (order.quantity or 1)

        status = order_status.get(order.sub_order_no)
        if status in ('Return', 'RTO'):
            s["settlement_returns_rto"] += row_settlement

        # Classify each DISTINCT order exactly once.
        if order.sub_order_no not in s["seen_orders"]:
            s["seen_orders"].add(order.sub_order_no)
            s["total_orders"] += 1
            if status == 'Return':
                s["returns"] += 1
            elif status == 'RTO':
                s["rto"] += 1
            elif status == 'Delivered':
                s["delivered"] += 1
            else:
                s["other"] += 1

    results = []
    for s in stats.values():
        settlement = round(s["settlement"], 2)
        product_cost = round(s["product_cost"], 2)
        profit = round(settlement - product_cost, 2)

        # Identical loss definition to the Profitability page.
        if not s["has_cost"] or profit >= 0:
            continue

        loss_amount = round(product_cost - settlement, 2)  # positive magnitude
        reason = _build_loss_reason(
            loss_amount, settlement, product_cost, s["total_orders"],
            s["delivered"], s["returns"], s["rto"], s["other"],
            round(s["settlement_returns_rto"], 2),
        )

        results.append({
            "sku": s["sku"],
            "product_name": s["product_name"],
            "total_orders": s["total_orders"],
            "delivered": s["delivered"],
            "returns": s["returns"],
            "rto": s["rto"],
            "other": s["other"],
            "settlement": settlement,
            "product_cost": product_cost,
            "loss_amount": loss_amount,
            "estimated_profit": profit,
            "reason": reason,
        })

    # Biggest loss first.
    results.sort(key=lambda r: r["loss_amount"], reverse=True)
    return {"loss_products": results, "count": len(results)}
