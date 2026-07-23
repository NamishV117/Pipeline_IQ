/**
 * Retailer Store Portal (Member 4)
 * CRUD: CREATE order, DELETE (cancel) order, READ orders/products/invoice
 */

let _cart = [];

async function renderRetailer(container) {
  const eid = currentUser.entity_id;
  container.innerHTML = '<div class="loading">Loading Retailer Portal...</div>';
  try {
    const [ordData, prodData] = await Promise.all([
      API.getOrders(eid, "retailer", 90),
      fetch("/api/analytics/products").then(r => r.json()).catch(() => ({ products: _fallbackProducts() })),
    ]);
    const ords = ordData.orders || [];
    const prods = prodData.products || _fallbackProducts();
    const spend = ords.reduce((s, o) => s + o.amount, 0);
    const pend = ords.filter(o => o.status === "pending").length;
    _cart = [];

    container.innerHTML = `
      <section class="hero-banner">
        <p class="hero-scope-label">RETAILER STORE PORTAL — ${(currentEntity?.city || "").toUpperCase()}</p>
        <h1 class="hero-title">🏪 <span class="role-highlight">${currentEntity?.entity_name || eid}</span></h1>
        <p class="hero-desc">Browse the product catalog, place orders to your distributor, track deliveries, and manage invoices.</p>
      </section>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Total Orders</span><div class="kpi-icon" style="background:rgba(168,85,247,0.1);color:#a855f7">📦</div></div>
          <div class="kpi-value">${ords.length}</div>
          <div class="kpi-delta neutral">In last 90 days</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Total Spend</span><div class="kpi-icon" style="background:rgba(16,185,129,0.1);color:#10b981">₹</div></div>
          <div class="kpi-value">₹${(spend / 1000).toFixed(1)}K</div>
          <div class="kpi-delta neutral">Cumulative procurement</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Pending Delivery</span><div class="kpi-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b">🚚</div></div>
          <div class="kpi-value">${pend}</div>
          <div class="kpi-delta ${pend > 0 ? 'warn' : 'good'}">Orders awaiting delivery</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header"><span class="kpi-label">Assigned Distributor</span><div class="kpi-icon" style="background:rgba(34,211,238,0.1);color:#22d3ee">🔗</div></div>
          <div class="kpi-value" style="font-size:1.2rem">${currentEntity?.parent_id || "—"}</div>
          <div class="kpi-delta neutral">Your supply chain node</div>
        </div>
      </div>

      <div class="section-header">
        <span class="section-title">🛒 PRODUCT CATALOG — PLACE NEW ORDER</span>
        <span class="section-subtitle">${prods.length} products available</span>
      </div>
      <div class="matrix-grid" id="ret-catalog"></div>

      <div class="section-header" style="margin-top:24px">
        <span class="section-title">🛒 SHOPPING CART</span>
        <span class="section-subtitle" id="cart-count">0 items</span>
      </div>
      <div class="chart-card" id="cart-box" style="margin-bottom:24px">
        <div class="activity-empty">Cart is empty. Add products from the catalog above.</div>
      </div>

      <div class="section-header">
        <span class="section-title">📋 ORDER HISTORY</span>
        <span class="section-subtitle">${ords.length} orders on record</span>
      </div>
      <div class="chart-card" id="ret-orders-table"></div>
    `;

    // Render product catalog cards
    const catalog = document.getElementById("ret-catalog");
    prods.forEach(p => {
      const card = document.createElement("div");
      card.className = "stockist-card";
      card.innerHTML = `
        <div class="stockist-top">
          <span class="stockist-id" style="color:#22d3ee">${p.sku_id}</span>
          <span class="stockist-status healthy">${p.category}</span>
        </div>
        <div class="stockist-name">${p.name}</div>
        <div class="stockist-region">₹${p.unit_price} per unit</div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
          <input type="number" min="1" max="500" value="10" id="qty-${p.sku_id}" class="matrix-search" style="width:80px;text-align:center">
          <button class="alert-action info" style="flex:1;font-size:0.78rem" data-sku="${p.sku_id}" data-name="${p.name.replace(/"/g, '')}" data-price="${p.unit_price}" onclick="retAddToCart(this)">Add to Cart →</button>
        </div>
      `;
      catalog.appendChild(card);
    });

    // Render order history table
    retRenderOrdersTable(ords);

    // Create invoice modal if not exists
    if (!document.getElementById("invoice-modal")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal-overlay" id="invoice-modal" style="display:none" onclick="if(event.target===this)closeModal('invoice-modal')">
          <div class="modal-card">
            <div class="modal-header">
              <h3>📄 Invoice</h3>
              <button class="modal-close" onclick="closeModal('invoice-modal')">✕</button>
            </div>
            <div class="modal-body" id="invoice-box">Loading...</div>
          </div>
        </div>
      `);
    }

  } catch (err) {
    container.innerHTML = `<div class="loading" style="color:#ef4444">Failed to load: ${err.message}</div>`;
  }
}

function _fallbackProducts() {
  return [
    { sku_id: "SKU-001", name: "Shampoo 200ml", unit_price: 180, category: "Personal Care" },
    { sku_id: "SKU-006", name: "Detergent 1kg", unit_price: 220, category: "Home Care" },
    { sku_id: "SKU-011", name: "Cooking Oil 1L", unit_price: 195, category: "Food & Beverage" },
    { sku_id: "SKU-012", name: "Cooking Oil 5L", unit_price: 890, category: "Food & Beverage" },
    { sku_id: "SKU-013", name: "Basmati Rice 5kg", unit_price: 520, category: "Food & Beverage" },
    { sku_id: "SKU-015", name: "Tea 500g", unit_price: 280, category: "Food & Beverage" },
    { sku_id: "SKU-016", name: "Toned Milk 500ml", unit_price: 28, category: "Dairy" },
    { sku_id: "SKU-019", name: "Butter 100g", unit_price: 56, category: "Dairy" },
    { sku_id: "SKU-020", name: "Cheese Slices 200g", unit_price: 125, category: "Dairy" },
  ];
}

function retRenderOrdersTable(orders) {
  const el = document.getElementById("ret-orders-table");
  if (!el) return;
  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Order ID</th><th>Product</th><th>Qty</th><th>Amount (₹)</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        ${orders.slice(0, 25).map(o => `<tr id="ret-row-${o.order_id}">
          <td style="font-family:var(--mono);font-size:0.78rem">${o.order_id}</td>
          <td>${o.sku_name || o.sku_id}</td>
          <td>${o.qty}</td>
          <td>₹${o.amount.toLocaleString()}</td>
          <td><span class="status-pill ${o.status}" id="ret-status-${o.order_id}">${o.status}</span></td>
          <td>${o.date}</td>
          <td>
            <button class="btn-drill" onclick="retViewInvoice('${o.order_id}')" style="margin-right:8px">Invoice</button>
            ${o.status === "pending" ? `<button class="btn-drill" style="color:#ef4444" id="cancel-btn-${o.order_id}" onclick="retCancelOrder('${o.order_id}',this)">Cancel</button>` : ""}
          </td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;
}

// ── Cart ──

function retAddToCart(btn) {
  const sku = btn.dataset.sku;
  const name = btn.dataset.name;
  const price = parseFloat(btn.dataset.price);
  const qty = parseInt(document.getElementById(`qty-${sku}`)?.value || 10);
  const existing = _cart.find(c => c.sku_id === sku);
  if (existing) { existing.qty += qty; }
  else { _cart.push({ sku_id: sku, name, unit_price: price, qty }); }
  showToast(`Added ${qty}x ${name} to cart`, "info");
  retRenderCart();
}

function retRenderCart() {
  const el = document.getElementById("cart-box");
  const cnt = document.getElementById("cart-count");
  if (!el) return;
  if (!_cart.length) {
    el.innerHTML = '<div class="activity-empty">Cart is empty. Add products from the catalog above.</div>';
    if (cnt) cnt.textContent = "0 items";
    return;
  }
  if (cnt) cnt.textContent = `${_cart.length} items`;
  const sub = _cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
  const tax = Math.round(sub * 0.18);
  const total = sub + tax;

  el.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Product</th><th>Unit Price</th><th>Qty</th><th>Line Total</th><th></th></tr></thead>
      <tbody>
        ${_cart.map((c, i) => `<tr>
          <td>${c.name}</td>
          <td>₹${c.unit_price}</td>
          <td>${c.qty}</td>
          <td>₹${(c.qty * c.unit_price).toLocaleString()}</td>
          <td><button class="btn-drill" style="color:#ef4444" onclick="_cart.splice(${i},1);retRenderCart()">✕ Remove</button></td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:1px solid var(--border);margin-top:12px">
      <div style="color:var(--fg-muted);font-size:0.85rem">
        Subtotal: ₹${sub.toLocaleString()} &middot; GST (18%): ₹${tax.toLocaleString()} &middot;
        <strong style="color:#fff;font-size:1.15rem">Total: ₹${total.toLocaleString()}</strong>
      </div>
      <button class="alert-action opportunity" id="place-order-btn" onclick="retPlaceOrder()">
        Place Order (₹${total.toLocaleString()}) →
      </button>
    </div>
  `;
}

async function retPlaceOrder() {
  if (!_cart.length) return;
  const btn = document.getElementById("place-order-btn");
  if (btn) { btn.disabled = true; btn.textContent = "Placing order..."; }
  const distId = currentEntity?.parent_id || "DST-001";

  try {
    let placed = 0;
    for (const item of _cart) {
      await API.createOrder({
        from_entity: currentUser.entity_id,
        to_entity: distId,
        sku_id: item.sku_id,
        qty: item.qty,
      });
      placed++;
    }
    showToast(`✅ ${placed} order(s) placed successfully!`, "success");
    _cart = [];
    retRenderCart();
    if (btn) { btn.textContent = "✅ Orders Placed!"; btn.style.background = "linear-gradient(135deg,#10b981,#059669)"; }

    // Refresh the order history to show new orders
    setTimeout(async () => {
      const newData = await API.getOrders(currentUser.entity_id, "retailer", 90);
      retRenderOrdersTable(newData.orders || []);
    }, 500);
  } catch (err) {
    showToast("Failed: " + err.message, "error");
    if (btn) { btn.disabled = false; btn.textContent = "Place Order →"; }
  }
}

// ── Invoice ──

async function retViewInvoice(orderId) {
  const modal = document.getElementById("invoice-modal");
  const box = document.getElementById("invoice-box");
  modal.style.display = "flex";
  box.innerHTML = '<div class="loading">Generating invoice...</div>';

  try {
    const data = await API.getInvoice(orderId);
    const inv = data.invoice;
    box.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:28px">
        <div style="display:flex;justify-content:space-between;margin-bottom:24px">
          <div>
            <h4 style="color:#a855f7;font-size:1.3rem;margin-bottom:4px">INVOICE</h4>
            <span style="color:var(--fg-muted);font-size:0.85rem">Order: <strong style="color:#fff">${inv.order_id}</strong></span>
          </div>
          <div style="text-align:right;color:var(--fg-muted);font-size:0.85rem">
            Date: ${inv.date}<br>
            Status: <span class="status-pill ${inv.status}">${inv.status}</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;padding:12px 16px;background:var(--bg-card);border-radius:8px;font-size:0.85rem">
          <div>Billed To: <strong style="color:#fff">${inv.retailer_id}</strong></div>
          <div>Shipped Via: <strong style="color:#fff">${inv.distributor_id}</strong></div>
        </div>
        <table class="data-table">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
          <tbody>
            ${inv.lines.map(l => `<tr>
              <td>${l.product_name}</td>
              <td>${l.qty}</td>
              <td>₹${l.unit_price.toLocaleString()}</td>
              <td style="font-weight:600">₹${l.line_total.toLocaleString()}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <div style="text-align:right;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
          <div style="color:var(--fg-muted);margin-bottom:4px">Subtotal: ₹${inv.subtotal.toLocaleString()}</div>
          <div style="color:var(--fg-muted);margin-bottom:4px">GST (${(inv.tax_rate * 100).toFixed(0)}%): ₹${inv.tax_amount.toLocaleString()}</div>
          <div style="color:#10b981;font-size:1.4rem;font-weight:800;margin-top:8px">Total: ₹${inv.total.toLocaleString()}</div>
        </div>
      </div>
    `;
  } catch (err) {
    box.innerHTML = `<div class="loading" style="color:#ef4444">Failed to generate invoice: ${err.message}</div>`;
  }
}

// ── Cancel ──

async function retCancelOrder(orderId, btn) {
  if (!confirm(`Are you sure you want to cancel order ${orderId}?`)) return;
  try {
    btn.disabled = true; btn.textContent = "Cancelling...";
    await API.cancelOrder(orderId);
    showToast(`❌ Order ${orderId} cancelled`, "info");
    btn.textContent = "Cancelled";
    btn.style.color = "#5a6278";

    // Update status pill
    const statusEl = document.getElementById(`ret-status-${orderId}`);
    if (statusEl) { statusEl.textContent = "cancelled"; statusEl.className = "status-pill cancelled"; }
  } catch (err) {
    showToast("Failed: " + err.message, "error");
    btn.disabled = false; btn.textContent = "Cancel";
  }
}
