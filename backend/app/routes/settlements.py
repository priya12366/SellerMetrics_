from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.payment import Payment
from app.routes.auth import get_current_user
from app.schemas.settlement import SettlementResponse, SettlementDetail

router = APIRouter(
    prefix="/api/settlements",
    tags=["Settlements"]
)

@router.get("", response_model=SettlementResponse)
def get_settlements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns settlement details by joining Orders and Payments on user_id and sub_order_no.
    Returns matched rows only, newest payment_date first.
    If multiple payment rows exist for one order, each is returned separately.
    """
    results = (
        db.query(Order, Payment)
        .join(Payment, (Order.user_id == Payment.user_id) & (Order.sub_order_no == Payment.sub_order_no))
        .filter(Order.user_id == current_user.id)
        .order_by(desc(Payment.payment_date))
        .all()
    )

    settlements = []
    for order, payment in results:
        detail = SettlementDetail(
            order_id=order.id,
            sub_order_no=order.sub_order_no,
            order_date=order.order_date,
            payment_date=payment.payment_date,
            
            product_name=order.product_name,
            sku=order.sku,
            quantity=order.quantity,
            
            live_order_status=payment.live_order_status,
            
            total_sale_amount=payment.total_sale_amount,
            total_sale_return_amount=payment.total_sale_return_amount,
            
            fixed_fee=payment.fixed_fee,
            warehousing_fee=payment.warehousing_fee,
            return_premium=payment.return_premium,
            return_premium_return=payment.return_premium_return,
            
            commission_amount=payment.commission_amount,
            gold_platform_fee=payment.gold_platform_fee,
            mall_platform_fee=payment.mall_platform_fee,
            
            return_shipping_charge=payment.return_shipping_charge,
            gst_compensation=payment.gst_compensation,
            shipping_charge=payment.shipping_charge,
            
            other_support_service_charges=payment.other_support_service_charges,
            waivers=payment.waivers,
            net_other_support_service_charges=payment.net_other_support_service_charges,
            gst_on_support_service_charges=payment.gst_on_support_service_charges,
            
            tcs=payment.tcs,
            tds=payment.tds,
            
            compensation=payment.compensation,
            claims=payment.claims,
            recovery=payment.recovery,
            
            final_settlement_amount=payment.final_settlement_amount
        )
        settlements.append(detail)
        
    return SettlementResponse(total=len(settlements), settlements=settlements)
