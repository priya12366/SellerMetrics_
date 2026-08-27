from sqlalchemy.orm import Session
from collections import defaultdict
from decimal import Decimal
from app.models.order import Order
from app.models.payment import Payment
from app.services.deduction_service import sum_deduction_columns, build_deduction_breakdown
from sqlalchemy import func, case, distinct, and_, text

def get_summary_report(db: Session, user_id: int) -> dict:
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    payments = db.query(Payment).filter(Payment.user_id == user_id).all()

    total_orders = len(orders)
    total_payment_rows = len(payments)

    orders_by_sub = {o.sub_order_no: o for o in orders if o.sub_order_no}
    payments_by_sub = defaultdict(list)
    for p in payments:
        if p.sub_order_no:
            payments_by_sub[p.sub_order_no].append(p)

    matched_orders_count = 0
    unmatched_orders_count = 0
    
    delivered_orders = 0
    return_rto_orders = 0

    for sub_order_no, o in orders_by_sub.items():
        matched_pays = payments_by_sub.get(sub_order_no, [])
        if not matched_pays:
            unmatched_orders_count += 1
        else:
            matched_orders_count += 1
            
            # Check statuses for this order
            statuses = [p.live_order_status for p in matched_pays if p.live_order_status]
            if any(s.lower() == "delivered" for s in statuses):
                delivered_orders += 1
            if any(s.lower() in ("return", "rto") for s in statuses):
                return_rto_orders += 1

    unmatched_payment_rows = sum(len(pays) for sub, pays in payments_by_sub.items() if sub not in orders_by_sub)
    
    # Also add payments that had no sub_order_no (rare/edge case) to unmatched
    unmatched_payment_rows += sum(1 for p in payments if not p.sub_order_no)

    # Financial Metrics
    def init_financials():
        return {
            "gross_sale_amount": Decimal('0.00'),
            "sale_return_amount": Decimal('0.00'),
            "final_settlement_amount": Decimal('0.00'),
            "return_shipping_charges": Decimal('0.00'),
            "shipping_charges": Decimal('0.00'),
            "commission_amount": Decimal('0.00'),
            "tcs": Decimal('0.00'),
            "tds": Decimal('0.00'),
            "claims": Decimal('0.00'),
            "recovery": Decimal('0.00'),
            "compensation": Decimal('0.00')
        }
        
    matched_financials = init_financials()
    all_payment_financials = init_financials()

    def accumulate_financials(target, p):
        if p.total_sale_amount is not None: target["gross_sale_amount"] += Decimal(str(p.total_sale_amount))
        if p.total_sale_return_amount is not None: target["sale_return_amount"] += Decimal(str(p.total_sale_return_amount))
        if p.final_settlement_amount is not None: target["final_settlement_amount"] += Decimal(str(p.final_settlement_amount))
        if p.return_shipping_charge is not None: target["return_shipping_charges"] += Decimal(str(p.return_shipping_charge))
        if p.shipping_charge is not None: target["shipping_charges"] += Decimal(str(p.shipping_charge))
        if p.commission_amount is not None: target["commission_amount"] += Decimal(str(p.commission_amount))
        if p.tcs is not None: target["tcs"] += Decimal(str(p.tcs))
        if p.tds is not None: target["tds"] += Decimal(str(p.tds))
        if p.claims is not None: target["claims"] += Decimal(str(p.claims))
        if p.recovery is not None: target["recovery"] += Decimal(str(p.recovery))
        if p.compensation is not None: target["compensation"] += Decimal(str(p.compensation))
        
    matched_payments_set = set()
    matched_payment_objs = []
    for sub_order_no, matched_pays in payments_by_sub.items():
        if sub_order_no in orders_by_sub:
            for p in matched_pays:
                matched_payments_set.add(p.id)
                matched_payment_objs.append(p)
                accumulate_financials(matched_financials, p)

    for p in payments:
        accumulate_financials(all_payment_financials, p)

    def format_financials(fin_dict):
        return {k: str(v) for k, v in fin_dict.items()}

    # Source-backed, itemised deduction breakdown for the MATCHED scope, built by
    # the shared single-source-of-truth helper (same logic Period Analysis uses).
    # Each line is a direct sum of a real payment column; together they reconcile
    # Gross Sales -> Settlement Received. Nothing here is invented or derived by
    # subtraction (the residual "Other adjustments" line only appears if the real
    # columns don't already fully reconcile).
    matched_gross = float(matched_financials["gross_sale_amount"])
    matched_settlement = float(matched_financials["final_settlement_amount"])
    matched_breakdown = build_deduction_breakdown(
        sum_deduction_columns(matched_payment_objs),
        matched_gross,
        matched_settlement,
    )

    return {
        "total_orders": total_orders,
        "matched_orders": matched_orders_count,
        "unmatched_orders": unmatched_orders_count,
        "total_payment_rows": total_payment_rows,
        "unmatched_payment_rows": unmatched_payment_rows,
        "delivered_orders": delivered_orders,
        "return_rto_orders": return_rto_orders,
        "matched_financials": format_financials(matched_financials),
        "all_payment_financials": format_financials(all_payment_financials),
        # Additive fields — existing consumers are unaffected.
        "matched_financials_breakdown": matched_breakdown,
        "matched_total_deductions": round(matched_gross - matched_settlement, 2),
    }

def get_matching_summary(db: Session, user_id: int) -> dict:
    # Orders metrics
    total_orders = db.query(Order).filter(Order.user_id == user_id).count()
    unique_orders = db.query(func.count(distinct(Order.sub_order_no))).filter(Order.user_id == user_id).scalar() or 0
    orders_missing_sub_order_no = db.query(Order).filter(Order.user_id == user_id, Order.sub_order_no.is_(None)).count()
    
    # Check duplicate orders (sub_order_no grouped having count > 1)
    duplicate_orders = db.query(Order.sub_order_no).filter(
        Order.user_id == user_id, 
        Order.sub_order_no.isnot(None)
    ).group_by(Order.sub_order_no).having(func.count(Order.id) > 1).count()

    # Payments metrics
    total_payments = db.query(Payment).filter(Payment.user_id == user_id).count()
    payments_missing_sub_order_no = db.query(Payment).filter(Payment.user_id == user_id, Payment.sub_order_no.is_(None)).count()
    
    # Check duplicate payments (sub_order_no + transaction_id grouped having count > 1)
    duplicate_payments = db.query(Payment.sub_order_no, Payment.transaction_id).filter(
        Payment.user_id == user_id,
        Payment.sub_order_no.isnot(None)
    ).group_by(Payment.sub_order_no, Payment.transaction_id).having(func.count(Payment.id) > 1).count()

    # Matching metrics
    # Matched unique orders
    matched_orders = db.query(func.count(distinct(Order.sub_order_no))).join(
        Payment, 
        and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(Order.user_id == user_id).scalar() or 0
    
    unmatched_orders = max(0, unique_orders - matched_orders)
    
    # Matched payment rows (rows that have a matching order)
    matched_payment_rows = db.query(Payment).join(
        Order,
        and_(Payment.user_id == Order.user_id, Payment.sub_order_no == Order.sub_order_no)
    ).filter(Payment.user_id == user_id).count()
    
    unmatched_payment_rows = max(0, total_payments - matched_payment_rows)

    match_rate = 0.0
    if unique_orders > 0:
        match_rate = round((matched_orders / unique_orders) * 100, 2)

    return {
        "orders": {
            "total_rows": total_orders,
            "unique_sub_orders": unique_orders
        },
        "payments": {
            "total_rows": total_payments
        },
        "matching": {
            "matched_orders": matched_orders,
            "unmatched_orders": unmatched_orders,
            "matched_payment_rows": matched_payment_rows,
            "unmatched_payment_rows": unmatched_payment_rows,
            "match_rate": match_rate
        },
        "data_quality": {
            "duplicate_order_rows": duplicate_orders,
            "duplicate_payment_rows": duplicate_payments,
            "orders_missing_sub_order_no": orders_missing_sub_order_no,
            "payments_missing_sub_order_no": payments_missing_sub_order_no
        }
    }

def get_unmatched_orders(db: Session, user_id: int, skip: int = 0, limit: int = 50):
    # Orders where sub_order_no is not in Payments for this user
    # Using a left outer join approach for better performance than NOT IN
    query = db.query(Order).outerjoin(
        Payment, 
        and_(Order.user_id == Payment.user_id, Order.sub_order_no == Payment.sub_order_no)
    ).filter(
        Order.user_id == user_id,
        Payment.id.is_(None)
    )
    
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": orders
    }

def get_unmatched_payments(db: Session, user_id: int, skip: int = 0, limit: int = 50):
    # Payments where sub_order_no is not in Orders for this user
    query = db.query(Payment).outerjoin(
        Order,
        and_(Payment.user_id == Order.user_id, Payment.sub_order_no == Order.sub_order_no)
    ).filter(
        Payment.user_id == user_id,
        Order.id.is_(None)
    )
    
    total = query.count()
    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "items": payments
    }

