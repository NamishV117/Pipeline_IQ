"""
Head Office Analytics Router (Member 1)
=========================================
GET /api/analytics/head-office  → network KPIs + chart data + scorecard
GET /api/analytics/stockist-scorecard → detailed stockist comparison
"""

from fastapi import APIRouter
from backend.database import (
    get_orders, get_inventory, get_payments, get_purchase_orders,
    get_hierarchy, get_deliveries, get_entity_info, get_activity_log, DB,
)
from collections import Counter, defaultdict
from datetime import datetime, timedelta

router = APIRouter()

NOW = datetime.now()


def _format_inr(value):
    if value >= 1_00_00_000:
        return f"₹{value / 1_00_00_000:.1f} Cr"
    elif value >= 1_00_000:
        return f"₹{value / 1_00_000:.1f} L"
    elif value >= 1000:
        return f"₹{value / 1000:.1f}K"
    return f"₹{value:,.0f}"


@router.get("/head-office")
def head_office_analytics():
    """Full Head Office dashboard data in one API call."""

    orders = get_orders(days=90)
    inventory = get_inventory()
    payments = get_payments()
    deliveries = DB["deliveries"]

    # ── KPIs ──
    total_revenue = sum(o["amount"] for o in orders)
    total_orders = len(orders)
    delivered = sum(1 for o in orders if o["status"] == "delivered")
    fill_rate = round((delivered / max(total_orders, 1)) * 100, 1)

    low_stock = [i for i in inventory if i["current_stock"] < i["safety_stock"]]
    stockout_count = len(set(i["sku_id"] for i in low_stock))

    overdue_payments = [p for p in payments if p["status"] == "overdue"]
    overdue_amount = sum(p["amount"] for p in overdue_payments)

    failed = sum(1 for o in orders if o["status"] == "failed")
    pending = sum(1 for o in orders if o["status"] == "pending")

    # 30d vs prev 30d delta
    cutoff_30 = (NOW - timedelta(days=30)).strftime("%Y-%m-%d")
    cutoff_60 = (NOW - timedelta(days=60)).strftime("%Y-%m-%d")
    rev_30 = sum(o["amount"] for o in orders if o["date"] >= cutoff_30)
    rev_prev = sum(o["amount"] for o in orders if cutoff_60 <= o["date"] < cutoff_30)
    rev_delta = round(((rev_30 - rev_prev) / max(rev_prev, 1)) * 100, 1)

    kpis = {
        "total_revenue": total_revenue,
        "total_revenue_display": _format_inr(total_revenue),
        "revenue_delta": f"{rev_delta:+.1f}%",
        "fill_rate": fill_rate,
        "total_orders": total_orders,
        "stockout_alerts": stockout_count,
        "overdue_amount": overdue_amount,
        "overdue_display": _format_inr(overdue_amount),
        "overdue_count": len(overdue_payments),
        "failed_deliveries": failed,
        "pending_orders": pending,
    }

    # ── Revenue Trend (daily, 90 days) ──
    daily_rev = defaultdict(float)
    for o in orders:
        daily_rev[o["date"]] += o["amount"]
    dates_sorted = sorted(daily_rev.keys())
    revenue_trend = {
        "labels": dates_sorted,
        "values": [round(daily_rev[d], 2) for d in dates_sorted],
    }
    # 7-day moving average
    vals = revenue_trend["values"]
    ma7 = []
    for i in range(len(vals)):
        window = vals[max(0, i - 6):i + 1]
        ma7.append(round(sum(window) / len(window), 2))
    revenue_trend["moving_avg"] = ma7

    # ── Stockist Performance ──
    stockists = [h for h in get_hierarchy() if h["entity_type"] == "stockist"]
    stockist_perf = []
    for stk in stockists:
        stk_orders = [o for o in orders if o["stockist_id"] == stk["entity_id"]]
        stk_total = len(stk_orders)
        stk_delivered = sum(1 for o in stk_orders if o["status"] == "delivered")
        stk_failed = sum(1 for o in stk_orders if o["status"] == "failed")
        stk_revenue = sum(o["amount"] for o in stk_orders)
        stk_fill = round((stk_delivered / max(stk_total, 1)) * 100, 1)

        # Avg delivery days
        stk_order_ids = {o["order_id"] for o in stk_orders}
        stk_dels = [d for d in deliveries if d["order_id"] in stk_order_ids and d["delivery_days"] is not None]
        avg_del = round(sum(d["delivery_days"] for d in stk_dels) / max(len(stk_dels), 1), 1)

        # Overdue for this stockist
        dist_ids = {h["entity_id"] for h in get_hierarchy()
                    if h["entity_type"] == "distributor" and h["parent_id"] == stk["entity_id"]}
        stk_overdue = sum(p["amount"] for p in overdue_payments if p["distributor_id"] in dist_ids)

        stockist_perf.append({
            "stockist_id": stk["entity_id"],
            "name": stk["entity_name"],
            "city": stk["city"],
            "region": stk["region"],
            "total_orders": stk_total,
            "delivered": stk_delivered,
            "failed": stk_failed,
            "revenue": round(stk_revenue, 2),
            "revenue_display": _format_inr(stk_revenue),
            "fill_rate": stk_fill,
            "avg_delivery_days": avg_del,
            "overdue_amount": round(stk_overdue, 2),
        })

    # ── Category Spend ──
    cat_spend = defaultdict(float)
    for o in orders:
        cat_spend[o["category"]] += o["amount"]
    category_data = {
        "labels": list(cat_spend.keys()),
        "values": [round(v, 2) for v in cat_spend.values()],
    }

    # ── Regional Distribution ──
    region_rev = defaultdict(float)
    for o in orders:
        # Find region from hierarchy
        for h in DB["hierarchy"]:
            if h["entity_id"] == o["stockist_id"]:
                region_rev[h["region"]] += o["amount"]
                break
    regional_data = {
        "labels": list(region_rev.keys()),
        "values": [round(v, 2) for v in region_rev.values()],
    }

    # ── Order Status Breakdown ──
    status_counts = Counter(o["status"] for o in orders)
    status_data = {
        "labels": list(status_counts.keys()),
        "values": list(status_counts.values()),
    }

    # ── Action Center ──
    actions = _generate_actions(orders, inventory, payments, stockist_perf)

    return {
        "kpis": kpis,
        "revenue_trend": revenue_trend,
        "stockist_performance": stockist_perf,
        "category_spend": category_data,
        "regional_distribution": regional_data,
        "order_status": status_data,
        "actions": actions,
    }


@router.get("/distributor-scorecard")
def distributor_scorecard(stockist_id: str = None):
    """Distributor-level KPIs, optionally filtered by stockist."""
    orders = get_orders(days=90)
    deliveries = DB["deliveries"]
    payments = DB["payments"]
    hierarchy = get_hierarchy()

    distributors = [h for h in hierarchy if h["entity_type"] == "distributor"]
    if stockist_id:
        distributors = [d for d in distributors if d["parent_id"] == stockist_id]

    result = []
    for dist in distributors:
        dist_id = dist["entity_id"]
        dist_orders = [o for o in orders if o["to_entity"] == dist_id]
        total = len(dist_orders)
        delivered = sum(1 for o in dist_orders if o["status"] == "delivered")
        failed = sum(1 for o in dist_orders if o["status"] == "failed")
        revenue = sum(o["amount"] for o in dist_orders)
        success_rate = round((delivered / max(total, 1)) * 100, 1)

        dist_order_ids = {o["order_id"] for o in dist_orders}
        dist_dels = [d for d in deliveries if d["order_id"] in dist_order_ids and d["delivery_days"] is not None]
        avg_del = round(sum(d["delivery_days"] for d in dist_dels) / max(len(dist_dels), 1), 1)

        outstanding = sum(p["amount"] for p in payments
                          if p["distributor_id"] == dist_id and p["status"] in ("overdue", "pending"))

        retailers = [h for h in hierarchy if h["entity_type"] == "retailer" and h["parent_id"] == dist_id]

        result.append({
            "distributor_id": dist_id,
            "name": dist["entity_name"],
            "city": dist["city"],
            "region": dist["region"],
            "parent_stockist": dist["parent_id"],
            "total_orders": total,
            "revenue": round(revenue, 2),
            "delivery_success_rate": success_rate,
            "failed_deliveries": failed,
            "avg_delivery_days": avg_del,
            "outstanding_receivables": round(outstanding, 2),
            "retailer_count": len(retailers),
        })

    return {"distributors": result}


def _generate_actions(orders, inventory, payments, stockist_perf):
    """Generate prioritized actionable insights from real data."""
    actions = []

    # 1. Stockout alerts
    low_stock = [i for i in inventory if i["current_stock"] < i["safety_stock"]]
    stk_groups = defaultdict(list)
    for item in low_stock:
        stk_groups[item["entity_id"]].append(item)

    for stk_id, items in stk_groups.items():
        stk_info = next((s for s in stockist_perf if s["stockist_id"] == stk_id), None)
        stk_name = stk_info["name"] if stk_info else stk_id
        min_days = min(i["days_until_stockout"] for i in items)
        severity = "critical" if min_days < 5 else "warning"
        sku_names = ", ".join(i["sku_name"] for i in items[:3])

        actions.append({
            "severity": severity,
            "title": f"{stk_name}: {len(items)} SKUs below safety stock",
            "detail": f"Earliest stockout in {min_days:.0f} days. Affected: {sku_names}.",
            "action_label": "Auto-Generate POs",
            "action_key": f"gen_po_{stk_id}",
        })

    # 2. Worst distributor
    dist_sc = sorted(
        [{"id": d["entity_id"], "name": d["entity_name"], "rate": 0, "failed": 0, "city": d["city"]}
         for d in get_hierarchy() if d["entity_type"] == "distributor"],
        key=lambda x: x["rate"]
    )
    for d in get_hierarchy():
        if d["entity_type"] != "distributor":
            continue
        d_orders = [o for o in orders if o["to_entity"] == d["entity_id"]]
        total = len(d_orders)
        delivered = sum(1 for o in d_orders if o["status"] == "delivered")
        failed = sum(1 for o in d_orders if o["status"] == "failed")
        rate = round((delivered / max(total, 1)) * 100, 1)
        if rate < 60:
            actions.append({
                "severity": "critical",
                "title": f"{d['entity_name']} ({d['city']}): {rate}% delivery success rate",
                "detail": f"{failed} failed deliveries out of {total} orders.",
                "action_label": "Review Distributor",
                "action_key": f"review_{d['entity_id']}",
            })

    # 3. Overdue payments
    overdue = [p for p in payments if p["status"] == "overdue"]
    if overdue:
        total_overdue = sum(p["amount"] for p in overdue)
        actions.append({
            "severity": "warning",
            "title": f"{_format_inr(total_overdue)} in overdue receivables",
            "detail": f"{len(overdue)} overdue invoices across the network.",
            "action_label": "Send Collection Reminders",
            "action_key": "send_reminders_all",
        })

    # 4. Supplier delays
    pos = get_purchase_orders()
    delayed = [p for p in pos if p["status"] == "delayed"]
    if delayed:
        supplier_counts = Counter(p["supplier"] for p in delayed)
        worst_supplier, count = supplier_counts.most_common(1)[0]
        actions.append({
            "severity": "warning",
            "title": f"Supplier '{worst_supplier}' has {count} delayed POs",
            "detail": "Consider alternate sourcing or renegotiating lead times.",
            "action_label": "Flag Supplier",
            "action_key": f"flag_{worst_supplier.replace(' ', '_')}",
        })

    # 5. Performance gap
    if stockist_perf:
        best = max(stockist_perf, key=lambda x: x["fill_rate"])
        worst = min(stockist_perf, key=lambda x: x["fill_rate"])
        gap = best["fill_rate"] - worst["fill_rate"]
        if gap > 8:
            actions.append({
                "severity": "info",
                "title": f"Performance gap: {best['city']} ({best['fill_rate']}%) vs {worst['city']} ({worst['fill_rate']}%)",
                "detail": f"{gap:.1f}% fill rate gap. Investigate root cause in {worst['city']}.",
                "action_label": "Compare Regions",
                "action_key": "compare_regions",
            })

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    actions.sort(key=lambda x: severity_order.get(x["severity"], 3))
    return actions[:7]


# ──────────────────────── PRODUCTS (Member 4) ────────────────────────

@router.get("/products")
def list_products():
    """Return all products in the catalog."""
    return {"products": DB["products"]}


# ──────────────────────── STOCK HEALTH (Member 3) ────────────────────────

@router.get("/stock/{stockist_id}")
def stock_health(stockist_id: str):
    """Inventory health for a single stockist."""
    inventory = get_inventory(stockist_id)
    low = [i for i in inventory if i["current_stock"] < i["safety_stock"]]
    total_value = sum(
        i["current_stock"] * next((p["unit_price"] for p in DB["products"] if p["sku_id"] == i["sku_id"]), 0)
        for i in inventory
    )
    return {
        "stockist_id": stockist_id,
        "items": inventory,
        "low_stock": low,
        "low_stock_count": len(low),
        "total_items": len(inventory),
        "total_value": round(total_value, 2),
        "total_value_display": _format_inr(total_value),
    }


# ──────────────────────── DRILL-DOWN ────────────────────────

@router.get("/stockist/{stockist_id}")
def stockist_drilldown(stockist_id: str):
    """Full detail view for a single stockist — distributors, inventory, orders, POs."""
    orders = get_orders(entity_id=stockist_id, role="stockist", days=90)
    inventory = get_inventory(stockist_id)
    pos = get_purchase_orders(stockist_id)
    payments = get_payments(entity_id=stockist_id, role="stockist")
    hierarchy = get_hierarchy()
    deliveries = DB["deliveries"]

    stk_info = get_entity_info(stockist_id)

    # KPIs for this stockist
    total = len(orders)
    delivered = sum(1 for o in orders if o["status"] == "delivered")
    failed = sum(1 for o in orders if o["status"] == "failed")
    revenue = sum(o["amount"] for o in orders)
    fill_rate = round((delivered / max(total, 1)) * 100, 1)
    overdue_amt = sum(p["amount"] for p in payments if p["status"] == "overdue")

    low_stock = [i for i in inventory if i["current_stock"] < i["safety_stock"]]

    # Distributor scorecard under this stockist
    distributors = [h for h in hierarchy if h["entity_type"] == "distributor" and h["parent_id"] == stockist_id]
    dist_cards = []
    for dist in distributors:
        d_id = dist["entity_id"]
        d_orders = [o for o in orders if o["to_entity"] == d_id]
        d_total = len(d_orders)
        d_delivered = sum(1 for o in d_orders if o["status"] == "delivered")
        d_failed = sum(1 for o in d_orders if o["status"] == "failed")
        d_revenue = sum(o["amount"] for o in d_orders)
        d_rate = round((d_delivered / max(d_total, 1)) * 100, 1)

        d_order_ids = {o["order_id"] for o in d_orders}
        d_dels = [d for d in deliveries if d["order_id"] in d_order_ids and d["delivery_days"] is not None]
        d_avg = round(sum(d["delivery_days"] for d in d_dels) / max(len(d_dels), 1), 1)

        retailers = [h for h in hierarchy if h["entity_type"] == "retailer" and h["parent_id"] == d_id]

        dist_cards.append({
            "distributor_id": d_id,
            "name": dist["entity_name"],
            "city": dist["city"],
            "total_orders": d_total,
            "revenue": round(d_revenue, 2),
            "revenue_display": _format_inr(d_revenue),
            "delivery_success_rate": d_rate,
            "failed_deliveries": d_failed,
            "avg_delivery_days": d_avg,
            "retailer_count": len(retailers),
        })

    # Recent orders (last 20)
    recent_orders = sorted(orders, key=lambda o: o["date"], reverse=True)[:20]

    return {
        "stockist": stk_info,
        "kpis": {
            "revenue": round(revenue, 2),
            "revenue_display": _format_inr(revenue),
            "total_orders": total,
            "fill_rate": fill_rate,
            "failed": failed,
            "overdue_amount": round(overdue_amt, 2),
            "overdue_display": _format_inr(overdue_amt),
            "low_stock_count": len(low_stock),
        },
        "distributors": dist_cards,
        "inventory": inventory,
        "low_stock": low_stock,
        "purchase_orders": pos,
        "recent_orders": recent_orders,
    }


# ──────────────────────── HIERARCHY ────────────────────────

@router.get("/hierarchy")
def hierarchy_tree():
    """Return full hierarchy as a tree structure."""
    hierarchy = get_hierarchy()
    orders = get_orders(days=90)

    def count_orders(entity_id, role):
        return len(get_orders(entity_id=entity_id, role=role, days=90))

    def build_node(entity):
        children_list = [h for h in hierarchy if h.get("parent_id") == entity["entity_id"]]
        node = {
            "entity_id": entity["entity_id"],
            "name": entity["entity_name"],
            "type": entity["entity_type"],
            "city": entity.get("city", ""),
            "region": entity.get("region", ""),
            "children": [build_node(c) for c in children_list],
            "child_count": len(children_list),
        }
        return node

    hq = next((h for h in hierarchy if h["entity_type"] == "head_office"), None)
    if hq:
        tree = build_node(hq)
    else:
        tree = {"entity_id": "HQ-001", "name": "HQ", "type": "head_office", "children": []}

    return {"tree": tree}


# ──────────────────────── AI COPILOT ────────────────────────

@router.post("/copilot")
def copilot_query(req: dict):
    """Pre-computed AI copilot — keyword matching against data-driven answers."""
    query = req.get("query", "").lower().strip()
    role = req.get("role", "head_office")

    orders = get_orders(days=90)
    inventory = get_inventory()
    payments = get_payments()
    hierarchy = get_hierarchy()
    deliveries = DB["deliveries"]

    # ── Pre-compute common answers from REAL data ──
    # Worst distributor
    dist_rates = []
    for d in hierarchy:
        if d["entity_type"] != "distributor":
            continue
        d_orders = [o for o in orders if o["to_entity"] == d["entity_id"]]
        total = len(d_orders)
        delivered = sum(1 for o in d_orders if o["status"] == "delivered")
        failed = sum(1 for o in d_orders if o["status"] == "failed")
        cancelled = sum(1 for o in d_orders if o["status"] == "cancelled")
        rate = round((delivered / max(total, 1)) * 100, 1)
        dist_rates.append({
            "name": d["entity_name"], "id": d["entity_id"], "city": d["city"],
            "rate": rate, "total": total, "failed": failed, "cancelled": cancelled,
        })
    dist_rates.sort(key=lambda x: x["rate"])
    worst_dist = dist_rates[0] if dist_rates else None
    best_dist = dist_rates[-1] if dist_rates else None

    # Revenue by region
    region_rev = defaultdict(float)
    for o in orders:
        for h in hierarchy:
            if h["entity_id"] == o.get("stockist_id"):
                region_rev[h["region"]] += o["amount"]
                break
    worst_region = min(region_rev, key=region_rev.get) if region_rev else "N/A"
    best_region = max(region_rev, key=region_rev.get) if region_rev else "N/A"

    # Top selling product
    sku_rev = defaultdict(lambda: {"revenue": 0, "qty": 0, "name": ""})
    for o in orders:
        sku_rev[o["sku_id"]]["revenue"] += o["amount"]
        sku_rev[o["sku_id"]]["qty"] += o["qty"]
        sku_rev[o["sku_id"]]["name"] = o.get("sku_name", o["sku_id"])
    top_sku = max(sku_rev.values(), key=lambda x: x["revenue"]) if sku_rev else None

    # Overdue
    overdue = [p for p in payments if p["status"] == "overdue"]
    total_overdue = sum(p["amount"] for p in overdue)

    # Low stock
    low_stock = [i for i in inventory if i["current_stock"] < i["safety_stock"]]

    # ── Match query to answer ──
    answers = []

    if any(w in query for w in ["worst", "struggling", "bad", "poor", "lowest"]) and any(w in query for w in ["distributor", "delivery", "dist"]):
        if worst_dist:
            answers.append(f"**{worst_dist['name']}** ({worst_dist['id']}) in {worst_dist['city']} has the worst delivery rate at **{worst_dist['rate']}%**.")
            answers.append(f"Root cause: {worst_dist['failed']} failed + {worst_dist['cancelled']} cancelled out of {worst_dist['total']} total orders.")
            answers.append(f"Recommendation: Schedule a performance review and investigate last-mile delivery failures.")

    elif any(w in query for w in ["best", "top", "highest"]) and any(w in query for w in ["distributor", "delivery", "dist"]):
        if best_dist:
            answers.append(f"**{best_dist['name']}** ({best_dist['id']}) in {best_dist['city']} leads with **{best_dist['rate']}%** delivery success rate across {best_dist['total']} orders.")

    elif any(w in query for w in ["region", "zone", "struggling", "worst"]) and any(w in query for w in ["region", "zone", "area", "revenue"]):
        answers.append(f"**{worst_region}** region has the lowest revenue at **{_format_inr(region_rev.get(worst_region, 0))}**.")
        answers.append(f"**{best_region}** region leads at **{_format_inr(region_rev.get(best_region, 0))}**.")
        for r, v in sorted(region_rev.items(), key=lambda x: -x[1]):
            answers.append(f"  - {r}: {_format_inr(v)}")

    elif any(w in query for w in ["overdue", "payment", "receivable", "outstanding"]):
        answers.append(f"Total overdue receivables: **{_format_inr(total_overdue)}** across **{len(overdue)}** invoices.")
        # Group by distributor
        dist_overdue = defaultdict(float)
        for p in overdue:
            dist_overdue[p["distributor_id"]] += p["amount"]
        if dist_overdue:
            worst_d = max(dist_overdue, key=dist_overdue.get)
            d_name = next((h["entity_name"] for h in hierarchy if h["entity_id"] == worst_d), worst_d)
            answers.append(f"Highest overdue: **{d_name}** ({worst_d}) with {_format_inr(dist_overdue[worst_d])}.")

    elif any(w in query for w in ["stock", "inventory", "stockout", "low"]):
        answers.append(f"**{len(low_stock)}** SKUs across stockists are below safety stock levels.")
        stk_groups = defaultdict(list)
        for item in low_stock:
            stk_groups[item["entity_id"]].append(item["sku_name"])
        for stk_id, skus in stk_groups.items():
            stk_name = next((h["entity_name"] for h in hierarchy if h["entity_id"] == stk_id), stk_id)
            answers.append(f"  - **{stk_name}**: {', '.join(skus[:4])}{'...' if len(skus) > 4 else ''}")

    elif any(w in query for w in ["top", "best", "selling", "popular"]) and any(w in query for w in ["product", "sku", "item"]):
        if top_sku:
            answers.append(f"Top selling product: **{top_sku['name']}** with **{_format_inr(top_sku['revenue'])}** revenue and **{top_sku['qty']}** units sold.")

    elif any(w in query for w in ["summary", "overview", "status", "how", "going"]):
        total_rev = sum(o["amount"] for o in orders)
        total_orders = len(orders)
        delivered = sum(1 for o in orders if o["status"] == "delivered")
        fill = round((delivered / max(total_orders, 1)) * 100, 1)
        answers.append(f"**Network Summary (90 days):**")
        answers.append(f"  - Total Revenue: **{_format_inr(total_rev)}**")
        answers.append(f"  - Total Orders: **{total_orders}** ({delivered} delivered)")
        answers.append(f"  - Fill Rate: **{fill}%**")
        answers.append(f"  - Overdue: **{_format_inr(total_overdue)}** ({len(overdue)} invoices)")
        answers.append(f"  - Stockout Alerts: **{len(low_stock)}** SKUs below safety stock")

    # If no keyword match, use LLM with supply chain context
    if not answers:
        answers = _ask_llm(query, orders, inventory, payments, hierarchy, low_stock,
                           dist_rates, region_rev, total_overdue, top_sku)

    return {"query": query, "answer": "\n".join(answers)}


def _ask_llm(query, orders, inventory, payments, hierarchy, low_stock,
             dist_rates, region_rev, total_overdue, top_sku):
    """Call LLMFoundry with supply chain context for intelligent responses."""
    import httpx

    # Build context summary from real data
    total_rev = sum(o["amount"] for o in orders)
    total_orders = len(orders)
    delivered = sum(1 for o in orders if o["status"] == "delivered")
    fill = round((delivered / max(total_orders, 1)) * 100, 1)
    pending = sum(1 for o in orders if o["status"] == "pending")
    failed = sum(1 for o in orders if o["status"] == "failed")

    stockists = [h for h in hierarchy if h["entity_type"] == "stockist"]
    distributors = [h for h in hierarchy if h["entity_type"] == "distributor"]
    retailers = [h for h in hierarchy if h["entity_type"] == "retailer"]

    context = f"""You are an AI copilot for PipelineIQ, an FMCG supply chain management system.
Answer based on this REAL data:

NETWORK: {len(stockists)} stockists, {len(distributors)} distributors, {len(retailers)} retailers
REVENUE (90d): ₹{total_rev:,.0f} ({_format_inr(total_rev)})
ORDERS: {total_orders} total, {delivered} delivered, {pending} pending, {failed} failed
FILL RATE: {fill}%
OVERDUE PAYMENTS: ₹{total_overdue:,.0f} ({_format_inr(total_overdue)})
LOW STOCK: {len(low_stock)} SKUs below safety stock

DISTRIBUTOR PERFORMANCE:
{chr(10).join(f"- {d['name']} ({d['id']}): {d['rate']}% delivery, {d['failed']} failed, {d['total']} total" for d in dist_rates)}

REGIONAL REVENUE:
{chr(10).join(f"- {r}: {_format_inr(v)}" for r, v in sorted(region_rev.items(), key=lambda x: -x[1]))}

TOP PRODUCT: {top_sku['name'] if top_sku else 'N/A'} ({_format_inr(top_sku['revenue']) if top_sku else '0'})

LOW STOCK ITEMS:
{chr(10).join(f"- {i['sku_name']} at {i['entity_id']}: {i['current_stock']}/{i['safety_stock']} ({i['days_until_stockout']}d left)" for i in low_stock[:8])}

Keep answers concise (3-5 lines). Use **bold** for key numbers. Be specific with data."""

    try:
        LLM_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5hbWlzaC52YW5nYXBhbGx5QHN0cmFpdmUuY29tIn0.CRsXhZ8i94W0iVaizNhTq2-DRj8gSwk0iw9J-7clRMQ"
        r = httpx.post(
            "https://llmfoundry.straive.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {LLM_TOKEN}:pipelineiq"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": context},
                    {"role": "user", "content": query},
                ],
                "max_tokens": 300,
                "temperature": 0.3,
            },
            verify=False,
            timeout=12,
        )
        data = r.json()
        if "choices" in data:
            return [data["choices"][0]["message"]["content"]]
    except Exception as e:
        pass

    # Fallback if LLM fails
    return [
        "I can help you with insights about:",
        "  - **Distributor performance** — _\"Which distributor has the worst delivery rate?\"_",
        "  - **Regional analysis** — _\"Which region is struggling?\"_",
        "  - **Payments** — _\"Show me overdue payments\"_",
        "  - **Inventory** — _\"Which SKUs are low on stock?\"_",
        "  - **Products** — _\"What is the top selling product?\"_",
        "  - **Overview** — _\"Give me a network summary\"_",
    ]
