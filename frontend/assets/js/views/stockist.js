/**
 * Stockist Warehouse Hub (Member 3)
 * CRUD: CREATE PO (auto-generate), READ inventory/orders/POs
 */

async function renderStockist(container) {
  const eid = currentUser.entity_id;
  container.innerHTML = '<div class="loading">Loading Stockist Hub...</div>';
  try {
    const [stock, orders, pos] = await Promise.all([
      fetch(`/api/analytics/stock/${eid}`).then(r => r.json()),
      API.getOrders(eid, "stockist", 90),
      API.getPurchaseOrders(eid),
    ]);
    const inv = stock.items || [];
    const low = stock.low_stock || [];
    const ords = orders.orders || [];
    const poList = pos.purchase_orders || [];
    const delivered = ords.filter(o => o.status === "delivered").length;
    const fill = ords.length ? ((delivered / ords.length) * 100).toFixed(1) : 0;

    container.innerHTML = `
      <section class="hero-banner">
        <p class="hero-scope-label">STOCKIST WAREHOUSE VIEW — ${(currentEntity?.city || "").toUpperCase()}</p>
        <h1 class="hero-title">📦 <span class="role-highlight">${currentEntity?.entity_name || eid}</span></h1>
        <p class="hero-desc">Inventory management, procurement oversight, and distributor order tracking for <strong>${currentEntity?.city || ""}</strong> region.</p>
      </section>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Total SKUs Tracked</span><div class="kpi-icon" style="background:rgba(34,211,238,0.1);color:#22d3ee">📦</div></div>
          <div class="kpi-value">${stock.total_items}</div>
          <div class="kpi-delta neutral">Active inventory items</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Inventory Value</span><div class="kpi-icon" style="background:rgba(16,185,129,0.1);color:#10b981">₹</div></div>
          <div class="kpi-value">${stock.total_value_display}</div>
          <div class="kpi-delta neutral">Current stock valuation</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Low Stock Alerts</span><div class="kpi-icon" style="background:rgba(239,68,68,0.1);color:#ef4444">⚠</div></div>
          <div class="kpi-value" style="color:#ef4444">${stock.low_stock_count}</div>
          <div class="kpi-delta bad">SKUs below safety threshold</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Order Fill Rate</span><div class="kpi-icon" style="background:rgba(168,85,247,0.1);color:#a855f7">📊</div></div>
          <div class="kpi-value">${fill}%</div>
          <div class="kpi-delta ${fill >= 80 ? 'good' : 'warn'}">${ords.length} orders in 90 days</div>
        </div>
      </div>

      ${low.length > 0 ? `
        <div class="section-header">
          <span class="section-title">⚠ LOW STOCK — IMMEDIATE ACTION REQUIRED</span>
          <button class="alert-action critical" id="auto-po-all" style="font-size:0.78rem" onclick="stkAutoPoAll('${eid}')">Auto-Generate All POs →</button>
        </div>
        <div class="chart-card" style="margin-bottom:24px">
          <table class="data-table">
            <thead><tr><th>SKU</th><th>Product</th><th>Current Stock</th><th>Safety Stock</th><th>Days Until Stockout</th><th>Action</th></tr></thead>
            <tbody>
              ${low.map(i => `<tr>
                <td style="font-family:var(--mono);color:#22d3ee">${i.sku_id}</td>
                <td>${i.sku_name || i.name || i.sku_id}</td>
                <td style="color:#ef4444;font-weight:700">${i.current_stock}</td>
                <td>${i.safety_stock}</td>
                <td style="color:${i.days_until_stockout < 5 ? '#ef4444' : '#f59e0b'}">${i.days_until_stockout} days</td>
                <td><button class="alert-action critical" style="font-size:0.7rem;padding:4px 10px" data-sku="${i.sku_id}" data-name="${(i.sku_name || '').replace(/"/g, '')}" onclick="stkGenPo('${eid}',this.dataset.sku,this.dataset.name,this)">Generate PO →</button></td>
              </tr>`).join("")}
            </tbody>
          </table>
        </div>
      ` : '<div class="chart-card" style="margin-bottom:24px;padding:24px;text-align:center;color:#10b981">✅ All inventory levels are healthy — no action needed.</div>'}

      <div class="section-header">
        <span class="section-title">FULL INVENTORY STATUS</span>
        <span class="section-subtitle">${inv.length} SKUs across all categories</span>
      </div>
      <div class="chart-card" style="margin-bottom:24px">
        <table class="data-table">
          <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Current</th><th>Safety</th><th>Capacity</th><th>Status</th><th>Days Left</th></tr></thead>
          <tbody>
            ${inv.map(i => {
              const st = i.current_stock < i.safety_stock ? "Low" : i.current_stock > i.max_capacity * 0.8 ? "High" : "Normal";
              const sc = st === "Low" ? "failed" : st === "High" ? "pending" : "delivered";
              return `<tr>
                <td style="font-family:var(--mono);font-size:0.78rem">${i.sku_id}</td>
                <td>${i.sku_name || i.name || i.sku_id}</td>
                <td style="color:var(--fg-muted)">${i.category || ""}</td>
                <td style="font-weight:600;color:${i.current_stock < i.safety_stock ? '#ef4444' : '#fff'}">${i.current_stock}</td>
                <td>${i.safety_stock}</td>
                <td>${i.max_capacity}</td>
                <td><span class="status-pill ${sc}">${st}</span></td>
                <td>${i.days_until_stockout}d</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div class="section-header">
        <span class="section-title">PURCHASE ORDERS TRACKER</span>
        <span class="section-subtitle">${poList.length} POs on record</span>
      </div>
      <div class="chart-card">
        <table class="data-table">
          <thead><tr><th>PO ID</th><th>Supplier</th><th>Product</th><th>Qty</th><th>Amount (₹)</th><th>Status</th><th>Lead Time</th></tr></thead>
          <tbody>
            ${poList.slice(0, 20).map(p => `<tr>
              <td style="font-family:var(--mono)">${p.po_id}</td>
              <td>${p.supplier}</td>
              <td>${p.sku_name || p.sku_id}</td>
              <td>${p.qty}</td>
              <td>₹${(p.amount || 0).toLocaleString()}</td>
              <td><span class="status-pill ${p.status === 'received' ? 'delivered' : p.status === 'delayed' ? 'failed' : 'pending'}">${p.status}</span></td>
              <td>${p.lead_time_days}d</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="loading" style="color:#ef4444">Failed to load: ${err.message}</div>`;
  }
}

async function stkGenPo(stockistId, skuId, skuName, btn) {
  try {
    btn.disabled = true; btn.textContent = "Generating...";
    const result = await API.autoGeneratePO(stockistId, skuId);
    showToast(`✅ PO ${result.po.po_id} generated for ${skuName}`, "success");
    btn.textContent = "✅ Generated";
    btn.style.background = "linear-gradient(135deg,#10b981,#059669)";
    refreshActivityFeed();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
    btn.disabled = false; btn.textContent = "Generate PO →";
  }
}

async function stkAutoPoAll(stockistId) {
  const btn = document.getElementById("auto-po-all");
  if (btn) { btn.disabled = true; btn.textContent = "Generating..."; }
  try {
    const d = await fetch(`/api/analytics/stock/${stockistId}`).then(r => r.json());
    let count = 0;
    for (const item of (d.low_stock || []).slice(0, 5)) {
      await API.autoGeneratePO(stockistId, item.sku_id);
      count++;
    }
    showToast(`✅ ${count} Purchase Orders auto-generated`, "success");
    if (btn) { btn.textContent = `✅ ${count} POs Generated`; btn.style.background = "linear-gradient(135deg,#10b981,#059669)"; }
    refreshActivityFeed();
    // Refresh the full view after 1 second to show updated PO table
    setTimeout(() => renderStockist(document.getElementById("main-content")), 1200);
  } catch (err) {
    showToast("Failed: " + err.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "Auto-Generate All POs →"; }
  }
}
