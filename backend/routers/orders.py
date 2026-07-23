"""
Orders Router (Members 3 & 4)
================================
GET    /api/orders                          → list orders (filtered by entity)
POST   /api/orders/create                   → place new order (CRUD Create)
PATCH  /api/orders/{order_id}/dispatch      → mark as dispatched (CRUD Update)
DELETE /api/orders/{order_id}               → cancel order (CRUD Delete)
POST   /api/orders/po/auto-generate         → auto-generate PO (CRUD Create)
"""

from fastapi import APIRouter, HTTPException, Query
from backend.models import OrderCreate
from backend.database import (
    get_orders, get_product_by_sku, get_parent, get_inventory,
    add_order, update_order_status, delete_order, add_purchase_order,
    get_purchase_orders, get_activity_log, DB,
)
from datetime import datetime

router = APIRouter()


@router.get("")
def list_orders(entity_id: str = None, role: str = None, days: int = 90):
    orders = get_orders(entity_id=entity_id, role=role, days=days)
    return {"orders": orders, "count": len(orders)}


@router.post("/create")
def create_order(req: OrderCreate):
    """Retailer places a new order → CRUD Create."""
    product = get_product_by_sku(req.sku_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"SKU {req.sku_id} not found")

    dist_id = req.to_entity
    stk_id = get_parent(dist_id)

    order = {
        "from_entity": req.from_entity,
        "to_entity": dist_id,
        "stockist_id": stk_id,
        "sku_id": req.sku_id,
        "sku_name": product["name"],
        "category": product["category"],
        "qty": req.qty,
        "amount": round(req.qty * product["unit_price"], 2),
        "status": "pending",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "timestamp": datetime.now().strftime("%I:%M %p"),
    }
    result = add_order(order)
    return {"message": "Order placed successfully", "order": result}


@router.patch("/{order_id}/dispatch")
def dispatch_order(order_id: str):
    """Distributor marks order as dispatched → CRUD Update."""
    order = update_order_status(order_id, "dispatched")
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return {"message": f"Order {order_id} dispatched", "order": order}


@router.patch("/{order_id}/deliver")
def deliver_order(order_id: str):
    """Mark order as delivered → CRUD Update."""
    order = update_order_status(order_id, "delivered")
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return {"message": f"Order {order_id} delivered", "order": order}


@router.delete("/{order_id}")
def cancel_order(order_id: str):
    """Retailer cancels order → CRUD Delete (soft delete)."""
    order = delete_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
    return {"message": f"Order {order_id} cancelled", "order": order}


@router.post("/po/auto-generate")
def auto_generate_po(stockist_id: str, sku: str):
    """Stockist auto-generates a PO for low-stock SKU → CRUD Create."""
    product = get_product_by_sku(sku)
    if not product:
        raise HTTPException(status_code=404, detail=f"SKU {sku} not found")

    # Find current stock to calculate reorder qty
    inv = [i for i in get_inventory(stockist_id) if i["sku_id"] == sku]
    if inv:
        reorder_qty = inv[0]["safety_stock"] * 2 - inv[0]["current_stock"]
        reorder_qty = max(reorder_qty, 50)
    else:
        reorder_qty = 100

    import random
    suppliers = ["CleanCo Supplies", "FreshLife FMCG", "NaturaBest Ltd",
                 "PureEssence Corp", "HomeBright Mfg", "DailyNeeds Supply Co"]

    po = {
        "stockist_id": stockist_id,
        "supplier": random.choice(suppliers),
        "sku_id": sku,
        "sku_name": product["name"],
        "qty": reorder_qty,
        "amount": round(reorder_qty * product["unit_price"] * 0.85, 2),
        "status": "ordered",
        "lead_time_days": random.randint(3, 7),
        "order_date": datetime.now().strftime("%Y-%m-%d"),
        "expected_delivery": "",
    }
    result = add_purchase_order(po)
    return {"message": f"PO {result['po_id']} generated", "po": result}


@router.get("/po")
def list_pos(stockist_id: str = None):
    pos = get_purchase_orders(stockist_id)
    return {"purchase_orders": pos, "count": len(pos)}


@router.get("/activity")
def activity_feed(limit: int = 20):
    return {"activity": get_activity_log(limit)}


@router.get("/{order_id}/invoice")
def generate_invoice(order_id: str):
    """Generate an invoice for an order (Member 4 READ)."""
    order = None
    for o in DB["orders"]:
        if o["order_id"] == order_id:
            order = o
            break
    if not order:
        raise HTTPException(status_code=404, detail=f"Order {order_id} not found")

    product = get_product_by_sku(order["sku_id"])
    unit_price = product["unit_price"] if product else 0
    subtotal = order["qty"] * unit_price
    tax_rate = 0.18
    tax_amount = round(subtotal * tax_rate, 2)
    total = round(subtotal + tax_amount, 2)

    return {
        "invoice": {
            "order_id": order_id,
            "retailer_id": order["from_entity"],
            "distributor_id": order["to_entity"],
            "lines": [{"sku_id": order["sku_id"], "product_name": order.get("sku_name", order["sku_id"]),
                        "qty": order["qty"], "unit_price": unit_price, "line_total": subtotal}],
            "subtotal": subtotal, "tax_rate": tax_rate, "tax_amount": tax_amount,
            "total": total, "date": order["date"], "status": order["status"],
        }
    }
