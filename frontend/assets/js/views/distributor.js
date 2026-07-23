/**
 * Distributor Dispatch Center (Member 3)
 * CRUD: UPDATE order status (dispatch/deliver), READ orders
 */

async function renderDistributor(container) {
  const eid = currentUser.entity_id;
  container.innerHTML = '<div class="loading">Loading Dispatch Center...</div>';
  try {
    const data = await API.getOrders(eid, "distributor", 90);
    const ords = data.orders || [];
    const pending = ords.filter(o => o.status === "pending");
    const dispatched = ords.filter(o => o.status === "dispatched");
    const delivered = ords.filter(o => o.status === "delivered");
    const failed = ords.filter(o => o.status === "failed");
    const rev = ords.reduce((s, o) => s + o.amount, 0);
    const rate = ords.length ? ((delivered.length / ords.length) * 100).toFixed(1) : 0;

    // Store for filtering
    window._distAllOrders = ords;

    container.innerHTML = `
      <section class="hero-banner">
        <p class="hero-scope-label">DISTRIBUTOR DISPATCH CENTER — ${(currentEntity?.city || "").toUpperCase()}</p>
        <h1 class="hero-title">🚚 <span class="role-highlight">${currentEntity?.entity_name || eid}</span></h1>
        <p class="hero-desc">Last-mile delivery operations. Manage incoming orders, dispatch shipments, and track delivery performance.</p>
      </section>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Pending Orders</span><div class="kpi-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">📋</div></div>
          <div class="kpi-value" style="color:#f59e0b">${pending.length}</div>
          <div class="kpi-delta warn">Awaiting dispatch action</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">In Transit</span><div class="kpi-icon" style="background:rgba(59,130,246,0.1);color:#3b82f6">🚚</div></div>
          <div class="kpi-value">${dispatched.length}</div>
          <div class="kpi-delta neutral">Currently on the road</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Delivered</span><div class="kpi-icon" style="background:rgba(16,185,129,0.1);color:#10b981">✅</div></div>
          <div class="kpi-value">${delivered.length}</div>
          <div class="kpi-delta good">${rate}% delivery success</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Revenue Handled</span><div class="kpi-icon" style="background:rgba(168,85,247,0.1);color:#a855f7">₹</div></div>
          <div class="kpi-value">₹${(rev / 1000).toFixed(1)}K</div>
          <div class="kpi-delta neutral">${ords.length} total orders</div>
        </div>
      </div>

      ${pending.length > 0 ? `
        <div class="section-header">
          <span class="section-title">📦 PENDING ORDERS — ACTION REQUIRED</span>
          <span class="section-subtitle">${pending.length} orders awaiting dispatch</span>
        </div>
        <div class="alerts-grid" id="dist-pending-grid"></div>
      ` : ''}

      <div class="section-header" style="margin-top:24px">
        <span class="section-title">ALL ORDERS PIPELINE</span>
        <div class="matrix-controls">
          <select class="matrix-select" id="dist-status-filter" onchange="distApplyFilter()">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <div class="chart-card" id="dist-orders-table"></div>
    `;

    // Render pending cards
    if (pending.length > 0) {
      const grid = document.getElementById("dist-pending-grid");
      pending.slice(0, 6).forEach(o => {
        const card = document.createElement("div");
        card.className = "alert-card warning";
        card.id = `pending-card-${o.order_id}`;
        card.innerHTML = `
          <div class="alert-top">
            <span class="alert-badge warning">PENDING</span>
            <span class="alert-time">${o.date}</span>
          </div>
          <h4 class="alert-title">${o.order_id} — ${o.sku_name || o.sku_id}</h4>
          <p class="alert-detail">From: <strong>${o.from_entity}</strong> · Qty: ${o.qty} units · ₹${o.amount.toLocaleString()}</p>
          <button class="alert-action warning" id="dispatch-btn-${o.order_id}" onclick="distDispatchOrder('${o.order_id}',this)">Mark as Dispatched →</button>
        `;
        grid.appendChild(card);
      });
    }

    // Render full table
    distRenderOrdersTable(ords);

  } catch (err) {
    container.innerHTML = `<div class="loading" style="color:#ef4444">Failed to load: ${err.message}</div>`;
  }
}

function distRenderOrdersTable(orders) {
  const el = document.getElementById("dist-orders-table");
  if (!el) return;
  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Order ID</th><th>Retailer</th><th>Product</th><th>Qty</th><th>Amount (₹)</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>
        ${orders.slice(0, 40).map(o => `<tr id="row-${o.order_id}">
          <td style="font-family:var(--mono);font-size:0.78rem">${o.order_id}</td>
          <td>${o.from_entity}</td>
          <td>${o.sku_name || o.sku_id}</td>
          <td>${o.qty}</td>
          <td>₹${o.amount.toLocaleString()}</td>
          <td><span class="status-pill ${o.status}" id="status-${o.order_id}">${o.status}</span></td>
          <td>${o.date}</td>
          <td id="action-${o.order_id}">
            ${o.status === "pending" ? `<button class="alert-action warning" style="font-size:0.7rem;padding:4px 10px" onclick="distDispatchOrder('${o.order_id}',this)">Dispatch →</button>` :
              o.status === "dispatched" ? `<button class="alert-action info" style="font-size:0.7rem;padding:4px 10px" onclick="distDeliverOrder('${o.order_id}',this)">Deliver →</button>` :
              '<span style="color:var(--fg-dim)">—</span>'}
          </td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;
}

function distApplyFilter() {
  const status = document.getElementById("dist-status-filter")?.value;
  let filtered = window._distAllOrders || [];
  if (status) filtered = filtered.filter(o => o.status === status);
  distRenderOrdersTable(filtered);
}

async function distDispatchOrder(orderId, btn) {
  try {
    btn.disabled = true; btn.textContent = "Dispatching...";
    await API.dispatchOrder(orderId);
    showToast(`✅ Order ${orderId} dispatched successfully`, "success");

    // Update button to show "Deliver" action
    btn.textContent = "✅ Dispatched";
    btn.style.background = "linear-gradient(135deg,#10b981,#059669)";

    // Update status pill in the table
    const statusEl = document.getElementById(`status-${orderId}`);
    if (statusEl) { statusEl.textContent = "dispatched"; statusEl.className = "status-pill dispatched"; }

    // Update pending card if it exists
    const card = document.getElementById(`pending-card-${orderId}`);
    if (card) { card.className = "alert-card info"; card.querySelector(".alert-badge").textContent = "DISPATCHED"; card.querySelector(".alert-badge").className = "alert-badge info"; }

    // Replace action cell with Deliver button after a moment
    setTimeout(() => {
      const actionCell = document.getElementById(`action-${orderId}`);
      if (actionCell) {
        actionCell.innerHTML = `<button class="alert-action info" style="font-size:0.7rem;padding:4px 10px" onclick="distDeliverOrder('${orderId}',this)">Deliver →</button>`;
      }
    }, 800);

    // Update the local order status for filtering
    const order = (window._distAllOrders || []).find(o => o.order_id === orderId);
    if (order) order.status = "dispatched";

  } catch (err) {
    showToast("Failed: " + err.message, "error");
    btn.disabled = false; btn.textContent = "Dispatch →";
  }
}

async function distDeliverOrder(orderId, btn) {
  try {
    btn.disabled = true; btn.textContent = "Delivering...";
    await API.deliverOrder(orderId);
    showToast(`✅ Order ${orderId} delivered successfully`, "success");
    btn.textContent = "✅ Delivered";
    btn.style.background = "linear-gradient(135deg,#10b981,#059669)";

    // Update status pill
    const statusEl = document.getElementById(`status-${orderId}`);
    if (statusEl) { statusEl.textContent = "delivered"; statusEl.className = "status-pill delivered"; }

    // Update the local order status
    const order = (window._distAllOrders || []).find(o => o.order_id === orderId);
    if (order) order.status = "delivered";

  } catch (err) {
    showToast("Failed: " + err.message, "error");
    btn.disabled = false; btn.textContent = "Deliver →";
  }
}
