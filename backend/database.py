"""
FMCG OpsCopilot — In-Memory Data Store
========================================
Shared mutable state dictionary that all routers read/write.

Hierarchy: HQ → 3 Stockists → 5 Distributors → 10 Retailers
Products:  20 FMCG SKUs across 4 categories
Orders:    ~500 seeded over 90 days
"""

from datetime import datetime, timedelta
import random
import copy

random.seed(42)

NOW = datetime.now()
DATA_START = NOW - timedelta(days=90)

# ──────────────────────────── USERS ────────────────────────────

USERS = [
    {"username": "headoffice",    "password": "admin123",  "role": "head_office",  "entity_id": "HQ-001",  "name": "Executive Director"},
    {"username": "mumbai_stk",    "password": "stock123",  "role": "stockist",     "entity_id": "STK-001", "name": "Mumbai Stockist Hub"},
    {"username": "delhi_stk",     "password": "stock123",  "role": "stockist",     "entity_id": "STK-002", "name": "Delhi Stockist Hub"},
    {"username": "bangalore_stk", "password": "stock123",  "role": "stockist",     "entity_id": "STK-003", "name": "Bangalore Stockist Hub"},
    {"username": "andheri_dist",  "password": "dist123",   "role": "distributor",  "entity_id": "DST-001", "name": "Andheri Last-Mile"},
    {"username": "thane_dist",    "password": "dist123",   "role": "distributor",  "entity_id": "DST-002", "name": "Thane Last-Mile"},
    {"username": "dwarka_dist",   "password": "dist123",   "role": "distributor",  "entity_id": "DST-003", "name": "Dwarka Last-Mile"},
    {"username": "noida_dist",    "password": "dist123",   "role": "distributor",  "entity_id": "DST-004", "name": "Noida Last-Mile"},
    {"username": "whitefield_dist","password": "dist123",  "role": "distributor",  "entity_id": "DST-005", "name": "Whitefield Last-Mile"},
    {"username": "quickmart",     "password": "retail123", "role": "retailer",     "entity_id": "RET-001", "name": "QuickMart Convenience"},
    {"username": "freshstop",     "password": "retail123", "role": "retailer",     "entity_id": "RET-002", "name": "FreshStop Daily"},
]

# ──────────────────────────── HIERARCHY ────────────────────────────

HIERARCHY = [
    # Head Office
    {"entity_id": "HQ-001",  "entity_name": "FMCG OpsCopilot HQ", "entity_type": "head_office", "parent_id": None,      "region": "All India", "city": "Mumbai"},
    # Stockists → under HQ
    {"entity_id": "STK-001", "entity_name": "Mumbai Stockist",    "entity_type": "stockist",    "parent_id": "HQ-001",  "region": "West",  "city": "Mumbai"},
    {"entity_id": "STK-002", "entity_name": "Delhi Stockist",     "entity_type": "stockist",    "parent_id": "HQ-001",  "region": "North", "city": "Delhi"},
    {"entity_id": "STK-003", "entity_name": "Bangalore Stockist", "entity_type": "stockist",    "parent_id": "HQ-001",  "region": "South", "city": "Bangalore"},
    # Distributors → under Stockists
    {"entity_id": "DST-001", "entity_name": "Andheri Distributor",    "entity_type": "distributor", "parent_id": "STK-001", "region": "West",  "city": "Mumbai"},
    {"entity_id": "DST-002", "entity_name": "Thane Distributor",      "entity_type": "distributor", "parent_id": "STK-001", "region": "West",  "city": "Mumbai"},
    {"entity_id": "DST-003", "entity_name": "Dwarka Distributor",     "entity_type": "distributor", "parent_id": "STK-002", "region": "North", "city": "Delhi"},
    {"entity_id": "DST-004", "entity_name": "Noida Distributor",      "entity_type": "distributor", "parent_id": "STK-002", "region": "North", "city": "Delhi"},
    {"entity_id": "DST-005", "entity_name": "Whitefield Distributor", "entity_type": "distributor", "parent_id": "STK-003", "region": "South", "city": "Bangalore"},
    # Retailers → under Distributors
    {"entity_id": "RET-001", "entity_name": "QuickMart",       "entity_type": "retailer", "parent_id": "DST-001", "region": "West",  "city": "Mumbai"},
    {"entity_id": "RET-002", "entity_name": "FreshStop",       "entity_type": "retailer", "parent_id": "DST-001", "region": "West",  "city": "Mumbai"},
    {"entity_id": "RET-003", "entity_name": "DailyNeeds",      "entity_type": "retailer", "parent_id": "DST-002", "region": "West",  "city": "Mumbai"},
    {"entity_id": "RET-004", "entity_name": "ShopEasy",        "entity_type": "retailer", "parent_id": "DST-002", "region": "West",  "city": "Mumbai"},
    {"entity_id": "RET-005", "entity_name": "MegaMart",        "entity_type": "retailer", "parent_id": "DST-003", "region": "North", "city": "Delhi"},
    {"entity_id": "RET-006", "entity_name": "ValueStore",      "entity_type": "retailer", "parent_id": "DST-003", "region": "North", "city": "Delhi"},
    {"entity_id": "RET-007", "entity_name": "PrimeShop",       "entity_type": "retailer", "parent_id": "DST-004", "region": "North", "city": "Delhi"},
    {"entity_id": "RET-008", "entity_name": "CityMart",        "entity_type": "retailer", "parent_id": "DST-004", "region": "North", "city": "Delhi"},
    {"entity_id": "RET-009", "entity_name": "UrbanGrocer",     "entity_type": "retailer", "parent_id": "DST-005", "region": "South", "city": "Bangalore"},
    {"entity_id": "RET-010", "entity_name": "StarMart",        "entity_type": "retailer", "parent_id": "DST-005", "region": "South", "city": "Bangalore"},
]

# ──────────────────────────── PRODUCTS (20 SKUs) ────────────────────────────

PRODUCTS = [
    # Personal Care
    {"sku_id": "SKU-001", "name": "Shampoo 200ml",       "category": "Personal Care",    "unit_price": 180},
    {"sku_id": "SKU-002", "name": "Shampoo 500ml",       "category": "Personal Care",    "unit_price": 380},
    {"sku_id": "SKU-003", "name": "Body Wash 250ml",     "category": "Personal Care",    "unit_price": 220},
    {"sku_id": "SKU-004", "name": "Soap 100g (3-pack)",  "category": "Personal Care",    "unit_price": 120},
    {"sku_id": "SKU-005", "name": "Toothpaste 150g",     "category": "Personal Care",    "unit_price": 95},
    # Home Care
    {"sku_id": "SKU-006", "name": "Detergent 1kg",       "category": "Home Care",        "unit_price": 220},
    {"sku_id": "SKU-007", "name": "Dishwash Liquid 500ml","category": "Home Care",       "unit_price": 110},
    {"sku_id": "SKU-008", "name": "Floor Cleaner 1L",    "category": "Home Care",        "unit_price": 130},
    {"sku_id": "SKU-009", "name": "Toilet Cleaner 500ml","category": "Home Care",        "unit_price": 85},
    {"sku_id": "SKU-010", "name": "Glass Cleaner 500ml", "category": "Home Care",        "unit_price": 95},
    # Food & Beverage
    {"sku_id": "SKU-011", "name": "Cooking Oil 1L",      "category": "Food & Beverage",  "unit_price": 195},
    {"sku_id": "SKU-012", "name": "Cooking Oil 5L",      "category": "Food & Beverage",  "unit_price": 890},
    {"sku_id": "SKU-013", "name": "Basmati Rice 5kg",    "category": "Food & Beverage",  "unit_price": 520},
    {"sku_id": "SKU-014", "name": "Instant Noodles (4pk)","category": "Food & Beverage", "unit_price": 80},
    {"sku_id": "SKU-015", "name": "Tea 500g",            "category": "Food & Beverage",  "unit_price": 280},
    # Dairy
    {"sku_id": "SKU-016", "name": "Toned Milk 500ml",    "category": "Dairy",            "unit_price": 28},
    {"sku_id": "SKU-017", "name": "Full Cream Milk 1L",  "category": "Dairy",            "unit_price": 68},
    {"sku_id": "SKU-018", "name": "Curd 400g",           "category": "Dairy",            "unit_price": 45},
    {"sku_id": "SKU-019", "name": "Butter 100g",         "category": "Dairy",            "unit_price": 56},
    {"sku_id": "SKU-020", "name": "Cheese Slices 200g",  "category": "Dairy",            "unit_price": 125},
]

SUPPLIERS = [
    "CleanCo Supplies", "FreshLife FMCG", "NaturaBest Ltd",
    "PureEssence Corp", "HomeBright Mfg", "DailyNeeds Supply Co",
]

# ──────────────────────────── DISTRIBUTOR PERFORMANCE PROFILES ────────────────────────────

DIST_PROFILES = {
    "DST-001": {"delivered": 0.72, "dispatched": 0.10, "pending": 0.08, "cancelled": 0.04, "failed": 0.06},  # decent
    "DST-002": {"delivered": 0.48, "dispatched": 0.12, "pending": 0.15, "cancelled": 0.10, "failed": 0.15},  # struggling — Thane
    "DST-003": {"delivered": 0.80, "dispatched": 0.08, "pending": 0.06, "cancelled": 0.03, "failed": 0.03},  # strong
    "DST-004": {"delivered": 0.65, "dispatched": 0.12, "pending": 0.10, "cancelled": 0.06, "failed": 0.07},  # average
    "DST-005": {"delivered": 0.85, "dispatched": 0.06, "pending": 0.04, "cancelled": 0.03, "failed": 0.02},  # top performer
}

# ──────────────────────────── SEED FUNCTIONS ────────────────────────────

def _pick_status(dist_id):
    """Pick order status based on distributor's performance profile."""
    profile = DIST_PROFILES.get(dist_id, DIST_PROFILES["DST-001"])
    roll = random.random()
    cumulative = 0
    for status, prob in profile.items():
        cumulative += prob
        if roll < cumulative:
            return status
    return "pending"


def _seed_inventory():
    """Inventory tracked at stockist level per SKU."""
    rows = []
    for stk in ["STK-001", "STK-002", "STK-003"]:
        for prod in PRODUCTS:
            max_cap = random.randint(300, 1000)
            safety = int(max_cap * random.uniform(0.15, 0.30))
            daily_cons = random.randint(3, 25)

            # ~20% deliberately below safety stock for alerts
            if random.random() < 0.20:
                current = random.randint(int(safety * 0.1), int(safety * 0.7))
            else:
                current = random.randint(int(safety * 1.2), int(max_cap * 0.85))

            rows.append({
                "entity_id": stk,
                "sku_id": prod["sku_id"],
                "sku_name": prod["name"],
                "category": prod["category"],
                "current_stock": current,
                "safety_stock": safety,
                "max_capacity": max_cap,
                "daily_consumption": daily_cons,
                "days_until_stockout": round(current / max(daily_cons, 1), 1),
            })
    return rows


def _seed_orders():
    """Generate ~500 historical orders over 90 days."""
    # Map retailers to their distributor and stockist
    ret_to_dist = {}
    dist_to_stk = {}
    for h in HIERARCHY:
        if h["entity_type"] == "retailer":
            ret_to_dist[h["entity_id"]] = h["parent_id"]
        if h["entity_type"] == "distributor":
            dist_to_stk[h["entity_id"]] = h["parent_id"]

    retailers = [h["entity_id"] for h in HIERARCHY if h["entity_type"] == "retailer"]
    rows = []

    for i in range(1, 501):
        ret_id = random.choice(retailers)
        dist_id = ret_to_dist[ret_id]
        stk_id = dist_to_stk[dist_id]
        prod = random.choice(PRODUCTS)
        qty = random.randint(5, 80)
        amount = round(qty * prod["unit_price"] * random.uniform(0.92, 1.0), 2)
        days_ago = random.randint(0, 90)
        order_date = (NOW - timedelta(days=days_ago))
        status = _pick_status(dist_id)

        rows.append({
            "order_id": f"ORD-{i:05d}",
            "from_entity": ret_id,
            "to_entity": dist_id,
            "stockist_id": stk_id,
            "sku_id": prod["sku_id"],
            "sku_name": prod["name"],
            "category": prod["category"],
            "qty": qty,
            "amount": amount,
            "status": status,
            "date": order_date.strftime("%Y-%m-%d"),
            "timestamp": order_date.strftime("%I:%M %p"),
        })

    return rows


def _seed_deliveries(orders):
    """Generate delivery records for dispatched/delivered/failed orders."""
    rows = []
    for order in orders:
        if order["status"] not in ("delivered", "dispatched", "failed"):
            continue

        order_date = datetime.strptime(order["date"], "%Y-%m-%d")
        dispatch_delay = random.randint(0, 2)
        dispatched_date = order_date + timedelta(days=dispatch_delay)

        if order["status"] == "delivered":
            delivery_days = random.randint(1, 5)
            delivered_date = dispatched_date + timedelta(days=delivery_days)
            del_status = "delivered"
        elif order["status"] == "failed":
            delivered_date = None
            delivery_days = None
            del_status = "failed"
        else:
            delivered_date = None
            delivery_days = None
            del_status = "in_transit"

        rows.append({
            "delivery_id": f"DEL-{order['order_id'].split('-')[1]}",
            "order_id": order["order_id"],
            "dispatched_date": dispatched_date.strftime("%Y-%m-%d"),
            "delivered_date": delivered_date.strftime("%Y-%m-%d") if delivered_date else None,
            "delivery_days": delivery_days,
            "status": del_status,
        })
    return rows


def _seed_payments(orders):
    """Generate payment records for billable orders."""
    rows = []
    for order in orders:
        if order["status"] in ("cancelled",):
            continue

        order_date = datetime.strptime(order["date"], "%Y-%m-%d")
        due_date = order_date + timedelta(days=30)

        if order["status"] == "delivered":
            roll = random.random()
            if roll < 0.70:
                paid_date = order_date + timedelta(days=random.randint(5, 28))
                pay_status = "paid"
            elif roll < 0.85:
                paid_date = due_date + timedelta(days=random.randint(1, 20))
                pay_status = "paid_late"
            else:
                paid_date = None
                pay_status = "overdue"
        else:
            paid_date = None
            pay_status = "pending"

        rows.append({
            "payment_id": f"PAY-{order['order_id'].split('-')[1]}",
            "order_id": order["order_id"],
            "retailer_id": order["from_entity"],
            "distributor_id": order["to_entity"],
            "amount": order["amount"],
            "due_date": due_date.strftime("%Y-%m-%d"),
            "paid_date": paid_date.strftime("%Y-%m-%d") if paid_date else None,
            "status": pay_status,
        })
    return rows


def _seed_purchase_orders():
    """Stockist → Supplier purchase orders."""
    rows = []
    po_idx = 0
    for stk_id in ["STK-001", "STK-002", "STK-003"]:
        n_pos = random.randint(8, 15)
        for _ in range(n_pos):
            po_idx += 1
            supplier = random.choice(SUPPLIERS)
            prod = random.choice(PRODUCTS)
            qty = random.randint(50, 500)
            order_date = DATA_START + timedelta(days=random.randint(0, 85))

            # 25% have delays
            if random.random() < 0.25:
                lead_time = random.randint(8, 15)
            else:
                lead_time = random.randint(3, 7)

            expected = order_date + timedelta(days=lead_time)

            if expected < NOW - timedelta(days=5):
                status = "received"
            elif expected < NOW:
                status = random.choice(["received", "delayed"])
            else:
                status = random.choice(["in_transit", "ordered"])

            rows.append({
                "po_id": f"PO-{po_idx:04d}",
                "stockist_id": stk_id,
                "supplier": supplier,
                "sku_id": prod["sku_id"],
                "sku_name": prod["name"],
                "qty": qty,
                "amount": round(qty * prod["unit_price"] * 0.85, 2),  # wholesale discount
                "status": status,
                "lead_time_days": lead_time,
                "order_date": order_date.strftime("%Y-%m-%d"),
                "expected_delivery": expected.strftime("%Y-%m-%d"),
            })
    return rows


# ──────────────────────────── THE DATABASE ────────────────────────────

def _build_db():
    """Construct the full in-memory database."""
    orders = _seed_orders()
    return {
        "users": copy.deepcopy(USERS),
        "hierarchy": copy.deepcopy(HIERARCHY),
        "products": copy.deepcopy(PRODUCTS),
        "inventory": _seed_inventory(),
        "orders": orders,
        "deliveries": _seed_deliveries(orders),
        "payments": _seed_payments(orders),
        "purchase_orders": _seed_purchase_orders(),
        "next_order_id": 501,
        "next_po_id": 50,
        "activity_log": [],
    }


# Singleton — shared across all routers
DB = _build_db()


# ──────────────────────────── ACCESSOR HELPERS ────────────────────────────

def get_users():
    return DB["users"]

def authenticate(username: str, password: str):
    for u in DB["users"]:
        if u["username"] == username and u["password"] == password:
            return {k: v for k, v in u.items() if k != "password"}
    return None

def get_hierarchy():
    return DB["hierarchy"]

def get_products():
    return DB["products"]

def get_product_by_sku(sku_id: str):
    for p in DB["products"]:
        if p["sku_id"] == sku_id:
            return p
    return None

def get_entity_info(entity_id: str):
    for h in DB["hierarchy"]:
        if h["entity_id"] == entity_id:
            return h
    return None

def get_children(entity_id: str):
    """All descendants (recursive)."""
    result = []
    queue = [entity_id]
    while queue:
        current = queue.pop(0)
        for h in DB["hierarchy"]:
            if h["parent_id"] == current:
                result.append(h)
                queue.append(h["entity_id"])
    return result

def get_direct_children(entity_id: str):
    return [h for h in DB["hierarchy"] if h.get("parent_id") == entity_id]

def get_parent(entity_id: str):
    for h in DB["hierarchy"]:
        if h["entity_id"] == entity_id:
            return h.get("parent_id")
    return None

def get_inventory(entity_id: str = None):
    items = DB["inventory"]
    if entity_id:
        items = [i for i in items if i["entity_id"] == entity_id]
    return items

def get_orders(entity_id: str = None, role: str = None, days: int = 90):
    from datetime import datetime, timedelta
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    orders = [o for o in DB["orders"] if o["date"] >= cutoff]

    if entity_id and role:
        if role == "retailer":
            orders = [o for o in orders if o["from_entity"] == entity_id]
        elif role == "distributor":
            orders = [o for o in orders if o["to_entity"] == entity_id]
        elif role == "stockist":
            orders = [o for o in orders if o["stockist_id"] == entity_id]
    return orders

def get_deliveries(entity_id: str = None, role: str = None):
    order_ids = {o["order_id"] for o in get_orders(entity_id, role)}
    return [d for d in DB["deliveries"] if d["order_id"] in order_ids]

def get_payments(entity_id: str = None, role: str = None):
    if entity_id and role:
        if role == "distributor":
            return [p for p in DB["payments"] if p["distributor_id"] == entity_id]
        elif role == "retailer":
            return [p for p in DB["payments"] if p["retailer_id"] == entity_id]
        elif role == "stockist":
            dist_ids = {h["entity_id"] for h in DB["hierarchy"]
                        if h["entity_type"] == "distributor" and h["parent_id"] == entity_id}
            return [p for p in DB["payments"] if p["distributor_id"] in dist_ids]
    return DB["payments"]

def get_purchase_orders(stockist_id: str = None):
    pos = DB["purchase_orders"]
    if stockist_id:
        pos = [p for p in pos if p["stockist_id"] == stockist_id]
    return pos

def add_order(order: dict):
    """CRUD Create — add a new order to the DB."""
    DB["next_order_id"] += 1
    order["order_id"] = f"ORD-{DB['next_order_id']:05d}"
    DB["orders"].append(order)
    DB["activity_log"].append({
        "time": datetime.now().strftime("%I:%M %p"),
        "event": f"Order {order['order_id']} placed by {order['from_entity']}",
        "type": "order_created",
    })
    return order

def update_order_status(order_id: str, new_status: str):
    """CRUD Update — change order status."""
    for o in DB["orders"]:
        if o["order_id"] == order_id:
            o["status"] = new_status
            DB["activity_log"].append({
                "time": datetime.now().strftime("%I:%M %p"),
                "event": f"Order {order_id} status changed to {new_status}",
                "type": "order_updated",
            })
            return o
    return None

def delete_order(order_id: str):
    """CRUD Delete — cancel/remove an order."""
    for i, o in enumerate(DB["orders"]):
        if o["order_id"] == order_id:
            o["status"] = "cancelled"
            DB["activity_log"].append({
                "time": datetime.now().strftime("%I:%M %p"),
                "event": f"Order {order_id} cancelled",
                "type": "order_cancelled",
            })
            return o
    return None

def add_purchase_order(po: dict):
    """CRUD Create — add a new PO."""
    DB["next_po_id"] += 1
    po["po_id"] = f"PO-{DB['next_po_id']:04d}"
    DB["purchase_orders"].append(po)
    DB["activity_log"].append({
        "time": datetime.now().strftime("%I:%M %p"),
        "event": f"PO {po['po_id']} auto-generated for {po['stockist_id']}",
        "type": "po_created",
    })
    return po

def get_activity_log(limit: int = 20):
    """Return recent activity feed."""
    return list(reversed(DB["activity_log"][-limit:]))
