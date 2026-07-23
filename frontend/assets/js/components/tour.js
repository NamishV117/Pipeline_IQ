/**
 * Guided Pitch Walkthrough (Member 2)
 * Role-aware interactive step-by-step demo tour for judges
 */

const TOUR_STEPS_BY_ROLE = {
  head_office: [
    { title: "Welcome to PipelineIQ", desc: "A 4-tier FMCG supply chain copilot with role-based dashboards. Each user sees only what's relevant to their scope.", highlight: ".hero-banner" },
    { title: "Live KPI Metrics", desc: "These KPIs are computed in real-time from 500+ orders across 3 stockists, 5 distributors, and 10 retailers. No hardcoded values.", highlight: ".kpi-grid" },
    { title: "AI-Powered Action Center", desc: "Anomaly detection identifies stockout risks, delivery failures, and overdue payments. Each alert has a one-click action button that triggers real CRUD operations.", highlight: ".alerts-grid" },
    { title: "Interactive Analytics", desc: "Chart.js visuals showing revenue comparison, order pipeline distribution, trends, and category breakdowns — all from live data.", highlight: ".charts-grid" },
    { title: "Stockist Performance Matrix", desc: "Drill into any stockist to see their distributors, inventory, and orders. Search and filter by region.", highlight: ".matrix-grid" },
    { title: "Activity Feed", desc: "Every CRUD operation (order placement, PO generation, dispatch) appears here in real-time.", highlight: ".activity-feed" },
    { title: "AI Copilot", desc: "Ask natural language questions about your supply chain. Answers are computed from real data, not hardcoded.", highlight: ".copilot-box" },
    { title: "4 Role-Based Views", desc: "Head Office sees the full network. Stockists manage inventory. Distributors dispatch orders. Retailers place orders and view invoices.", highlight: ".topbar" },
  ],
  stockist: [
    { title: "Stockist Warehouse Hub", desc: "Manage your regional inventory, track stock levels, and auto-generate purchase orders for low-stock items.", highlight: ".hero-banner" },
    { title: "Inventory KPIs", desc: "Total SKUs, inventory value, low stock alerts, and order fill rate — all computed from real data.", highlight: ".kpi-grid" },
    { title: "Low Stock Alerts", desc: "Items below safety stock are flagged with one-click PO generation. Click 'Generate PO' to create a purchase order instantly.", highlight: ".chart-card" },
    { title: "Scope Security", desc: "You can only see inventory and orders for YOUR stockist region. Other stockists' data is hidden.", highlight: ".topbar" },
  ],
  distributor: [
    { title: "Distributor Dispatch Center", desc: "Manage incoming retailer orders. Dispatch shipments and track delivery performance.", highlight: ".hero-banner" },
    { title: "Order Pipeline KPIs", desc: "Pending, in-transit, delivered counts and revenue — updated in real-time as you dispatch orders.", highlight: ".kpi-grid" },
    { title: "Pending Orders", desc: "Click 'Mark as Dispatched' to update order status. The status change flows through the entire system — retailers see it, head office KPIs update.", highlight: ".alerts-grid" },
    { title: "Order Management", desc: "Filter by status, dispatch pending orders, mark dispatched orders as delivered. Full CRUD lifecycle.", highlight: ".chart-card" },
  ],
  retailer: [
    { title: "Retailer Store Portal", desc: "Browse the product catalog, place orders to your distributor, and manage your order history.", highlight: ".hero-banner" },
    { title: "Order KPIs", desc: "Total orders, spend, pending deliveries, and your assigned distributor — all scoped to your store.", highlight: ".kpi-grid" },
    { title: "Product Catalog", desc: "Select products, set quantities, and add to cart. Then place your order with one click — it creates a real order in the system.", highlight: ".matrix-grid" },
    { title: "Order History", desc: "View all your orders, generate invoices with GST breakdown, and cancel pending orders. Full CRUD operations.", highlight: ".chart-card" },
  ],
};

let _tourSteps = [];
let _tourStep = 0;
let _tourActive = false;

function startTour() {
  const role = (typeof currentUser !== "undefined" && currentUser?.role) || "head_office";
  _tourSteps = TOUR_STEPS_BY_ROLE[role] || TOUR_STEPS_BY_ROLE.head_office;
  _tourStep = 0;
  _tourActive = true;

  if (!document.getElementById("tour-overlay")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div id="tour-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:2000;display:none"></div>
      <div id="tour-card" style="position:fixed;z-index:2001;background:#12131a;border:1px solid #2a2d42;border-radius:14px;padding:28px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:none">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#a855f7,#d946ef,#22d3ee);border-radius:14px 14px 0 0"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span id="tour-step-label" style="font-size:0.7rem;font-weight:700;color:#a855f7;letter-spacing:0.08em;text-transform:uppercase"></span>
          <button onclick="endTour()" style="background:none;border:1px solid #2a2d42;color:#8892a8;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        <h3 id="tour-title" style="font-size:1.2rem;font-weight:700;color:#fff;margin-bottom:8px"></h3>
        <p id="tour-desc" style="color:#8892a8;font-size:0.9rem;line-height:1.6;margin-bottom:20px"></p>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <button id="tour-prev" onclick="tourPrev()" style="padding:8px 16px;background:transparent;border:1px solid #2a2d42;color:#8892a8;border-radius:8px;font-size:0.82rem;cursor:pointer;font-family:inherit">← Previous</button>
          <span id="tour-dots" style="color:#5a6278;font-size:0.75rem"></span>
          <button id="tour-next" onclick="tourNext()" style="padding:8px 16px;background:linear-gradient(135deg,#a855f7,#d946ef);color:#fff;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;font-family:inherit">Next →</button>
        </div>
      </div>
    `);
  }

  document.getElementById("tour-overlay").style.display = "block";
  document.getElementById("tour-card").style.display = "block";
  renderTourStep();
}

function renderTourStep() {
  const step = _tourSteps[_tourStep];
  document.getElementById("tour-step-label").textContent = `Step ${_tourStep + 1} of ${_tourSteps.length}`;
  document.getElementById("tour-title").textContent = step.title;
  document.getElementById("tour-desc").textContent = step.desc;
  document.getElementById("tour-dots").textContent = _tourSteps.map((_, i) => i === _tourStep ? "●" : "○").join(" ");
  document.getElementById("tour-prev").style.visibility = _tourStep === 0 ? "hidden" : "visible";
  document.getElementById("tour-next").textContent = _tourStep === _tourSteps.length - 1 ? "Finish ✓" : "Next →";

  // Clear previous highlights
  document.querySelectorAll("[data-tour-highlighted]").forEach(el => {
    el.style.zIndex = "";
    el.style.boxShadow = "";
    el.removeAttribute("data-tour-highlighted");
  });

  const card = document.getElementById("tour-card");
  const target = document.querySelector(step.highlight);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.style.position = "relative";
    target.style.zIndex = "2001";
    target.style.boxShadow = "0 0 0 4px rgba(168,85,247,0.4), 0 0 30px rgba(168,85,247,0.15)";
    target.style.borderRadius = "14px";
    target.setAttribute("data-tour-highlighted", "true");
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      card.style.top = Math.min(rect.bottom + 16, window.innerHeight - 300) + "px";
      card.style.left = Math.max(16, (window.innerWidth - 420) / 2) + "px";
      card.style.transform = "";
    }, 400);
  } else {
    card.style.top = "50%";
    card.style.left = "50%";
    card.style.transform = "translate(-50%, -50%)";
  }
}

function tourNext() { if (_tourStep < _tourSteps.length - 1) { _tourStep++; renderTourStep(); } else endTour(); }
function tourPrev() { if (_tourStep > 0) { _tourStep--; renderTourStep(); } }

function endTour() {
  _tourActive = false;
  document.getElementById("tour-overlay").style.display = "none";
  document.getElementById("tour-card").style.display = "none";
  document.querySelectorAll("[data-tour-highlighted]").forEach(el => {
    el.style.zIndex = ""; el.style.boxShadow = ""; el.removeAttribute("data-tour-highlighted");
  });
}
