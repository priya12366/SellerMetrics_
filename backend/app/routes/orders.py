import csv
import io
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.import_history import ImportHistory
from app.schemas.order import OrderResponse
from app.routes.auth import get_current_user
from app.services.cost_service import build_cost_map, cost_for_sku

router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"]
)

REQUIRED_HEADERS = [
    "Reason for Credit Entry",
    "Sub Order No",
    "Catalog ID",
    "Order Date",
    "Order source",
    "Customer State",
    "Product Name",
    "SKU",
    "Size",
    "Quantity",
    "Supplier Listed Price (Incl. GST + Commission)",
    "Supplier Discounted Price (Incl GST and Commision)",
    "Packet Id"
]

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

def parse_date(date_str: str):
    if not date_str:
        return None
    date_str = date_str.strip()
    formats = [
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y %H:%M:%S", "%d-%m-%Y",
        "%Y/%m/%d %H:%M:%S", "%Y/%m/%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y"
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            pass
    return None

def parse_float(val: str):
    if not val: return None
    try:
        return float(val.replace(',', '').strip())
    except ValueError:
        return None

def parse_int(val: str):
    if not val: return None
    try:
        return int(float(val.replace(',', '').strip()))
    except ValueError:
        return None

@router.post("/upload")
async def upload_orders(
    file: UploadFile = File(...), 
    reporting_period: Optional[str] = Form(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds the 50MB limit.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="The uploaded CSV is empty.")
    
    try:
        decoded_content = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded_content = contents.decode("cp1252")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="File encoding not supported. Please upload a UTF-8 CSV.")
            
    reader = csv.DictReader(io.StringIO(decoded_content))
    
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="The uploaded CSV is malformed or empty.")
        
    missing_headers = [h for h in REQUIRED_HEADERS if h not in reader.fieldnames]
    if missing_headers:
        raise HTTPException(status_code=400, detail=f"Missing required headers: {', '.join(missing_headers)}")
    
    # Pre-fetch existing sub orders for current user to avoid duplicates
    existing_sub_orders_query = db.query(Order.sub_order_no).filter(Order.user_id == current_user.id).all()
    existing_sub_orders = {row[0] for row in existing_sub_orders_query if row[0]}
    
    orders_to_insert = []
    total_rows = 0
    duplicate_rows = 0
    processed_in_batch = set()
    month_counts = {}
    
    try:
        for row in reader:
            total_rows += 1
            sub_order_no = row.get("Sub Order No")
            if sub_order_no:
                sub_order_no = sub_order_no.strip()
                
            if sub_order_no and (sub_order_no in existing_sub_orders or sub_order_no in processed_in_batch):
                duplicate_rows += 1
                continue
                
            if sub_order_no:
                processed_in_batch.add(sub_order_no)
            
            order_date_val = parse_date(row.get("Order Date"))
            if order_date_val:
                m_str = order_date_val.strftime("%B %Y")
                month_counts[m_str] = month_counts.get(m_str, 0) + 1
            
            new_order = Order(
                user_id=current_user.id,
                reason_for_credit_entry=row.get("Reason for Credit Entry", "").strip() or None,
                sub_order_no=sub_order_no or None,
                catalog_id=row.get("Catalog ID", "").strip() or None,
                order_date=order_date_val,
                order_source=row.get("Order source", "").strip() or None,
                customer_state=row.get("Customer State", "").strip() or None,
                product_name=row.get("Product Name", "").strip() or None,
                sku=row.get("SKU", "").strip() or None,
                size=row.get("Size", "").strip() or None,
                quantity=parse_int(row.get("Quantity")),
                supplier_listed_price=parse_float(row.get("Supplier Listed Price (Incl. GST + Commission)")),
                supplier_discounted_price=parse_float(row.get("Supplier Discounted Price (Incl GST and Commision)")),
                packet_id=row.get("Packet Id", "").strip() or None
            )
            orders_to_insert.append(new_order)
            
        if orders_to_insert:
            db.add_all(orders_to_insert)
            db.commit()
            
    except Exception as e:
        db.rollback()
        
        # Optionally log the failed attempt safely
        try:
            detected_period = max(month_counts, key=month_counts.get) if month_counts else None
            final_period = reporting_period or detected_period
            
            failed_history = ImportHistory(
                user_id=current_user.id,
                import_type="orders",
                reporting_period=final_period,
                original_filename=file.filename,
                file_size=len(contents),
                total_rows=total_rows,
                inserted_rows=0,
                duplicate_rows=0,
                status="failed"
            )
            db.add(failed_history)
            db.commit()
        except Exception:
            db.rollback()
            
        raise HTTPException(status_code=500, detail=f"An error occurred while parsing the CSV: {str(e)}")
        
    try:
        detected_period = max(month_counts, key=month_counts.get) if month_counts else None
        final_period = reporting_period or detected_period
        
        success_history = ImportHistory(
            user_id=current_user.id,
            import_type="orders",
            reporting_period=final_period,
            original_filename=file.filename,
            file_size=len(contents),
            total_rows=total_rows,
            inserted_rows=len(orders_to_insert),
            duplicate_rows=duplicate_rows,
            status="success"
        )
        db.add(success_history)
        db.commit()
    except Exception as history_error:
        # Don't fail the upload just because history failed, but rollback the history transaction
        db.rollback()
        
    return {
        "message": "Orders uploaded successfully",
        "total_rows": total_rows,
        "inserted_rows": len(orders_to_insert),
        "duplicate_rows": duplicate_rows,
        "reporting_period": final_period
    }

@router.get("", response_model=List[OrderResponse])
def get_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orders = db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.created_at.desc()).all()

    # Attach each order's centrally-configured COGS (single source of truth). The
    # cost is resolved through the shared trim + case-insensitive SKU lookup, so an
    # order shows exactly the cost set on the Product Costs page. When the SKU has
    # no configured cost, all three fields stay N/A (None / False) — never zero.
    cost_map = build_cost_map(db, current_user.id)
    for order in orders:
        unit_cost = cost_for_sku(cost_map, order.sku)
        if unit_cost is not None:
            qty = order.quantity or 1
            order.cost_per_unit = round(float(unit_cost), 2)
            order.total_cost = round(float(unit_cost) * qty, 2)
            order.has_cost = True
        else:
            order.cost_per_unit = None
            order.total_cost = None
            order.has_cost = False

    return orders
