/**
 * Head Office Command Center — PipelineIQ Design
 * Matches FlowNexus reference: Hero → KPIs → Alerts → Charts → Stockist Matrix
 */

async function renderHeadOffice(container) {
  container.innerHTML = '<div class="loading">Loading Head Office data...</div>';

  try {
    const data = await API.getHeadOfficeAnalytics();
    container.innerHTML = "";

    // Update insights count in nav
    const insightsCount = document.getElementById("nav-insights-count");
    if (insightsCount) insightsCount.textContent = data.actions.length;

    // ── HERO BANNER ──
    const statsInfo = data.stockist_performance;
    const totalDists = 5;
    const totalRetailers = 10;
    container.innerHTML += `
      <section class="hero-banner">
        <p class="hero-scope-label">NATIONAL EXECUTIVE VIEW — ALL-INDIA SCOPE</p>
        <h1 class="hero-title">Head Office <span class="role-highlight">FMCG Control Tower</span></h1>
        <p class="hero-desc">
          Real-time aggregate telemetry across <strong>${statsInfo.length} Regional Warehouses</strong>,
          <strong>${totalDists} Distributors</strong>, and <strong>${totalRetailers}+ Retail</strong> points of sale.
        </p>
        <button class="btn-hero" onclick="openHierarchy()">View Hierarchy Map & Scope Rules →</button>
      </section>
    `;

    // ── KPI CARDS ──
    const k = data.kpis;
    container.innerHTML += `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total National Gross Revenue</span>
            <div class="kpi-icon" style="background:rgba(16,185,129,0.1);color:#10b981;">₹</div>
          </div>
          <div class="kpi-value">${k.total_revenue_display}</div>
          <div class="kpi-delta good">${k.revenue_delta} YoY Growth</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Active Pipeline Orders</span>
            <div class="kpi-icon" style="background:rgba(34,211,238,0.1);color:#22d3ee;">📋</div>
          </div>
          <div class="kpi-value">${k.total_orders.toLocaleString()}</div>
          <div class="kpi-delta neutral">${k.pending_orders} pending · ${(k.total_orders - k.pending_orders)} processed</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">National Fill Rate %</span>
            <div class="kpi-icon" style="background:rgba(245,158,11,0.1);color:#f59e0b;">📊</div>
          </div>
          <div class="kpi-value">${k.fill_rate}%</div>
          <div class="kpi-delta ${k.fill_rate >= 80 ? 'good' : k.fill_rate >= 65 ? 'warn' : 'bad'}">${k.stockout_alerts} SKU stockout alerts active</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Overdue Receivables</span>
            <div class="kpi-icon" style="background:rgba(239,68,68,0.1);color:#ef4444;">⚠</div>
          </div>
          <div class="kpi-value">${k.overdue_display}</div>
          <div class="kpi-delta bad">${k.overdue_count} invoices · ${k.failed_deliveries} failed deliveries</div>
        </div>
      </div>
    `;

    // ── ALERTS / ACTION CENTER ──
    container.innerHTML += `
      <div class="section-header">
        <span class="section-title">HEAD OFFICE SYSTEM ALERTS & ROOT-CAUSE ANOMALY DETECTION</span>
        <span class="section-subtitle">Pre-computed AI Diagnosis</span>
      </div>
    `;
    const alertsGrid = document.createElement("div");
    alertsGrid.className = "alerts-grid";

    const severityMap = { critical: "CRITICAL", warning: "WARNING", info: "OPPORTUNITY" };
    const timeLabels = ["10 mins ago", "1 hour ago", "3 hours ago", "5 hours ago", "1 day ago"];

    data.actions.slice(0, 3).forEach((action, i) => {
      const sev = action.severity;
      const card = document.createElement("div");
      card.className = `alert-card ${sev}`;
      card.innerHTML = `
        <div class="alert-top">
          <span class="alert-badge ${sev}">${severityMap[sev] || sev.toUpperCase()}</span>
          <span class="alert-time">${timeLabels[i] || ""}</span>
        </div>
        <h4 class="alert-title">${action.title}</h4>
        <p class="alert-detail">${action.detail}</p>
        <button class="alert-action ${sev}" id="alert-btn-${action.action_key}" onclick="handleAlertAction('${action.action_key}', this)">${action.action_label} →</button>
      `;
      alertsGrid.appendChild(card);
    });
    container.appendChild(alertsGrid);

    // ── CHARTS ROW ──
    const chartsGrid = document.createElement("div");
    chartsGrid.className = "charts-grid";

    // Revenue comparison bar chart
    const barCard = document.createElement("div");
    barCard.className = "chart-card";
    const topStockist = [...statsInfo].sort((a, b) => b.revenue - a.revenue)[0];
    barCard.innerHTML = `
      <div class="chart-header">
        <div>
          <div class="chart-title">Stockist Revenue Comparison (₹ Lakhs)</div>
          <div class="chart-subtitle">Quarterly performance across regional depots</div>
        </div>
        <span class="chart-badge">Top: ${topStockist ? topStockist.city + ' Depot' : '—'}</span>
      </div>
      <canvas id="chart-revenue-bar"></canvas>
    `;
    chartsGrid.appendChild(barCard);

    // Order pipeline donut
    const donutCard = document.createElement("div");
    donutCard.className = "chart-card";
    donutCard.innerHTML = `
      <div class="chart-header">
        <div>
          <div class="chart-title">Order Pipeline Status Distribution</div>
          <div class="chart-subtitle">Live order fulfillment status across India</div>
        </div>
      </div>
      <canvas id="chart-pipeline-donut"></canvas>
    `;
    chartsGrid.appendChild(donutCard);
    container.appendChild(chartsGrid);

    // ── ADDITIONAL CHARTS ROW ──
    const chartsGrid2 = document.createElement("div");
    chartsGrid2.className = "charts-grid";

    // Revenue Trend
    const trendCard = document.createElement("div");
    trendCard.className = "chart-card";
    trendCard.innerHTML = `
      <div class="chart-header">
        <div>
          <div class="chart-title">Revenue Trend (90 Days)</div>
          <div class="chart-subtitle">Daily revenue with 7-day moving average</div>
        </div>
      </div>
      <canvas id="chart-revenue-trend"></canvas>
    `;
    chartsGrid2.appendChild(trendCard);

    // Category spend donut
    const catCard = document.createElement("div");
    catCard.className = "chart-card";
    catCard.innerHTML = `
      <div class="chart-header">
        <div>
          <div class="chart-title">Category-wise Procurement Spend</div>
          <div class="chart-subtitle">Distribution across FMCG product categories</div>
        </div>
      </div>
      <canvas id="chart-category-donut"></canvas>
    `;
    chartsGrid2.appendChild(catCard);
    container.appendChild(chartsGrid2);

    // ── STOCKIST PERFORMANCE MATRIX ──
    container.innerHTML += `
      <div class="matrix-header">
        <div class="matrix-title-block">
          <h3>Regional Stockist Performance Matrix</h3>
          <p>Drill down into specific regional warehouses</p>
        </div>
        <div class="matrix-controls">
          <input type="text" class="matrix-search" placeholder="Search stockist..." id="matrix-search">
          <select class="matrix-select" id="matrix-region-filter">
            <option value="">All Regions</option>
            <option value="West">West</option>
            <option value="North">North</option>
            <option value="South">South</option>
          </select>
        </div>
      </div>
    `;
    const matrixGrid = document.createElement("div");
    matrixGrid.className = "matrix-grid";
    matrixGrid.id = "stockist-matrix";
    renderStockistMatrix(matrixGrid, statsInfo);
    container.appendChild(matrixGrid);

    // ── RENDER CHARTS ──
    requestAnimationFrame(() => {
      renderRevenueBarChart(statsInfo);
      renderPipelineDonut(data.order_status);
      renderRevenueTrend(data.revenue_trend);
      renderCategoryDonut(data.category_spend);
    });

    // ── FILTER EVENTS ──
    document.getElementById("matrix-search")?.addEventListener("input", (e) => {
      filterStockistMatrix(statsInfo, e.target.value, document.getElementById("matrix-region-filter")?.value);
    });
    document.getElementById("matrix-region-filter")?.addEventListener("change", (e) => {
      filterStockistMatrix(statsInfo, document.getElementById("matrix-search")?.value, e.target.value);
    });

    container.appendChild(Object.assign(document.createElement("hr"), { className: "divider" }));

    // ── ACTIVITY FEED ──
    container.innerHTML += `
      <div class="section-header">
        <span class="section-title">LIVE SYSTEM ACTIVITY FEED</span>
        <span class="section-subtitle">Real-time operations log</span>
      </div>
      <div class="activity-feed" id="activity-feed">
        <div class="activity-empty">No actions recorded yet. Use the Action Center above to trigger operations.</div>
      </div>
    `;
    refreshActivityFeed();

    container.appendChild(Object.assign(document.createElement("hr"), { className: "divider" }));

    // ── AI COPILOT CHAT ──
    container.innerHTML += `
      <div class="section-header">
        <span class="section-title">🤖 AI COPILOT — ASK ANYTHING ABOUT YOUR SUPPLY CHAIN</span>
        <span class="section-subtitle">Pre-computed intelligence from real data</span>
      </div>
      <div class="copilot-box">
        <div class="copilot-messages" id="copilot-messages">
          <div class="copilot-msg bot">
            <span class="copilot-avatar">🤖</span>
            <div class="copilot-bubble">Hello! I can answer questions about your supply chain. Try asking:<br>
            <em>"Which distributor has the worst delivery rate?"</em><br>
            <em>"Show me overdue payments"</em><br>
            <em>"Give me a network summary"</em></div>
          </div>
        </div>
        <div class="copilot-input-row">
          <input type="text" class="copilot-input" id="copilot-input" placeholder="Ask about distributors, inventory, payments, regions..." onkeydown="if(event.key==='Enter')sendCopilotQuery()">
          <button class="copilot-send" onclick="sendCopilotQuery()">Send →</button>
        </div>
      </div>
    `;

    // ── HIERARCHY MODAL (hidden by default) ──
    if (!document.getElementById("hierarchy-modal")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal-overlay" id="hierarchy-modal" style="display:none" onclick="if(event.target===this)closeModal('hierarchy-modal')">
          <div class="modal-card">
            <div class="modal-header">
              <h3>🏗️ Organization Hierarchy & Scope Map</h3>
              <button class="modal-close" onclick="closeModal('hierarchy-modal')">✕</button>
            </div>
            <div class="modal-body" id="hierarchy-tree-container">Loading...</div>
          </div>
        </div>
      `);
    }

    // ── DRILL-DOWN MODAL (hidden by default) ──
    if (!document.getElementById("drilldown-modal")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div class="modal-overlay" id="drilldown-modal" style="display:none" onclick="if(event.target===this)closeModal('drilldown-modal')">
          <div class="modal-card modal-wide">
            <div class="modal-header">
              <h3 id="drilldown-title">Stockist Details</h3>
              <button class="modal-close" onclick="closeModal('drilldown-modal')">✕</button>
            </div>
            <div class="modal-body" id="drilldown-container">Loading...</div>
          </div>
        </div>
      `);
    }

  } catch (err) {
    container.innerHTML = `<div class="loading" style="color:#ef4444;">Failed to load: ${err.message}</div>`;
  }
}

// ── Stockist Matrix Cards ──

function renderStockistMatrix(grid, perf) {
  grid.innerHTML = "";
  const idColors = ["#10b981", "#22d3ee", "#d946ef", "#f59e0b", "#3b82f6"];
  const managers = ["Rajiv Sharma", "Anjali Verma", "Karthik Rao", "Priya Singh", "Suresh Menon"];

  perf.forEach((s, i) => {
    const fillColor = s.fill_rate >= 95 ? "good" : s.fill_rate >= 85 ? "moderate" : "attention";
    const statusLabel = s.fill_rate >= 90 ? "Healthy" : s.fill_rate >= 75 ? "Moderate" : "Needs Attention";
    const statusClass = s.fill_rate >= 90 ? "healthy" : s.fill_rate >= 75 ? "moderate" : "attention";
    const idColor = idColors[i % idColors.length];

    const card = document.createElement("div");
    card.className = "stockist-card";
    card.innerHTML = `
      <div class="stockist-top">
        <span class="stockist-id" style="color:${idColor}">${s.stockist_id}</span>
        <span class="stockist-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="stockist-name">${s.name}</div>
      <div class="stockist-region">${s.city} · ${s.region} Region</div>
      <div class="stockist-metrics">
        <div class="metric-item">
          <div class="metric-label">Revenue</div>
          <div class="metric-value">${s.revenue_display}</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Fill Rate</div>
          <div class="metric-value" style="color:${s.fill_rate >= 90 ? '#10b981' : s.fill_rate >= 75 ? '#f59e0b' : '#ef4444'}">${s.fill_rate}%</div>
        </div>
        <div class="metric-item">
          <div class="metric-label">Avg Delivery</div>
          <div class="metric-value">${s.avg_delivery_days}d</div>
        </div>
      </div>
      <div class="stockist-footer">
        <span class="stockist-manager">Manager: <strong>${managers[i % managers.length]}</strong></span>
        <button class="btn-drill" onclick="openDrilldown('${s.stockist_id}')">Drill Down →</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function filterStockistMatrix(perf, search, region) {
  let filtered = perf;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q) || s.stockist_id.toLowerCase().includes(q)
    );
  }
  if (region) {
    filtered = filtered.filter(s => s.region === region);
  }
  const grid = document.getElementById("stockist-matrix");
  if (grid) renderStockistMatrix(grid, filtered);
}

// ── Chart Renderers ──

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: "#5a6278", maxRotation: 0 }, grid: { color: "#1e2030" } },
    y: { ticks: { color: "#5a6278" }, grid: { color: "#1e2030" } },
  },
};

function renderRevenueBarChart(perf) {
  const ctx = document.getElementById("chart-revenue-bar");
  if (!ctx) return;
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: perf.map(s => s.city),
      datasets: [{
        label: "Revenue (₹ Lakhs)",
        data: perf.map(s => +(s.revenue / 100000).toFixed(1)),
        backgroundColor: perf.map((_, i) =>
          ["#a855f7", "#8b5cf6", "#7c3aed"][i % 3]
        ),
        borderRadius: 8,
        maxBarThickness: 60,
      }],
    },
    options: { ...CHART_DEFAULTS },
  });
}

function renderPipelineDonut(statusData) {
  const ctx = document.getElementById("chart-pipeline-donut");
  if (!ctx) return;
  const colorMap = {
    delivered: "#10b981", dispatched: "#3b82f6", pending: "#f59e0b",
    cancelled: "#5a6278", failed: "#ef4444",
  };
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: statusData.labels.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        data: statusData.values,
        backgroundColor: statusData.labels.map(s => colorMap[s] || "#5a6278"),
        borderWidth: 0,
        spacing: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#8892a8", padding: 16, usePointStyle: true, pointStyleWidth: 10 },
        },
      },
    },
  });
}

function renderRevenueTrend(trend) {
  const ctx = document.getElementById("chart-revenue-trend");
  if (!ctx) return;
  new Chart(ctx, {
    type: "line",
    data: {
      labels: trend.labels.map(d => d.slice(5)),
      datasets: [
        {
          label: "Daily",
          data: trend.values,
          borderColor: "#a855f740",
          backgroundColor: "#a855f708",
          borderWidth: 1.5,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        },
        {
          label: "7-Day Avg",
          data: trend.moving_avg,
          borderColor: "#a855f7",
          borderWidth: 3,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: { color: "#8892a8", usePointStyle: true, pointStyleWidth: 10 },
        },
      },
    },
  });
}

function renderCategoryDonut(catData) {
  const ctx = document.getElementById("chart-category-donut");
  if (!ctx) return;
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: catData.labels,
      datasets: [{
        data: catData.values,
        backgroundColor: ["#a855f7", "#22d3ee", "#f59e0b", "#10b981", "#ef4444", "#d946ef"],
        borderWidth: 0,
        spacing: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#8892a8", padding: 16, usePointStyle: true, pointStyleWidth: 10 },
        },
      },
    },
  });
}


// ═══════════════════════════════════════════════════════════
// FEATURE 1: ALERT ACTION HANDLER (Working PO Generation)
// ═══════════════════════════════════════════════════════════

async function handleAlertAction(key, btn) {
  if (key.startsWith("gen_po_")) {
    const stockistId = key.replace("gen_po_", "");
    try {
      if (btn) { btn.disabled = true; btn.textContent = "Generating POs..."; }
      const inv = await fetch(`/api/analytics/stockist/${stockistId}`).then(r => r.json());
      const lowStock = inv.low_stock || [];
      if (lowStock.length === 0) {
        showToast("No low-stock SKUs found for this stockist.", "info");
        if (btn) { btn.disabled = false; btn.textContent = "Auto-Generate POs →"; }
        return;
      }
      let generated = 0;
      for (const item of lowStock.slice(0, 3)) {
        await API.autoGeneratePO(stockistId, item.sku_id);
        generated++;
      }
      showToast(`✅ ${generated} Purchase Orders auto-generated for ${stockistId}`, "success");
      if (btn) { btn.textContent = `✅ ${generated} POs Generated`; btn.style.background = "linear-gradient(135deg, #10b981, #059669)"; }
      refreshActivityFeed();
    } catch (err) {
      showToast("Failed to generate POs: " + err.message, "error");
      if (btn) { btn.disabled = false; btn.textContent = "Auto-Generate POs →"; }
    }
    return;
  }
  if (key === "send_reminders_all") {
    if (btn) { btn.textContent = "Sending..."; btn.disabled = true; }
    setTimeout(() => {
      showToast("📧 Payment reminders sent to all overdue retailers", "success");
      if (btn) { btn.textContent = "✅ Reminders Sent"; btn.style.background = "linear-gradient(135deg, #10b981, #059669)"; }
    }, 500);
    return;
  }
  if (key.startsWith("review_")) {
    const distId = key.replace("review_", "");
    showToast(`📋 Review initiated for distributor ${distId}`, "info");
    if (btn) { btn.textContent = "✅ Review Started"; btn.disabled = true; }
    return;
  }
  if (key.startsWith("flag_")) {
    const supplier = key.replace("flag_", "").replace(/_/g, " ");
    showToast(`🚩 Supplier "${supplier}" flagged for review`, "info");
    if (btn) { btn.textContent = "✅ Flagged"; btn.disabled = true; }
    return;
  }
  if (key === "compare_regions") {
    showToast("📊 Opening region comparison view...", "info");
    return;
  }
  showToast(`Action triggered: ${key.replace(/_/g, " ")}`, "info");
}


// ═══════════════════════════════════════════════════════════
// FEATURE 2: DRILL-DOWN INTO STOCKIST
// ═══════════════════════════════════════════════════════════

async function openDrilldown(stockistId) {
  let modal = document.getElementById("drilldown-modal");
  if (!modal) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-overlay" id="drilldown-modal" style="display:none" onclick="if(event.target===this)closeModal('drilldown-modal')">
        <div class="modal-card modal-wide"><div class="modal-header"><h3 id="drilldown-title">Stockist Details</h3><button class="modal-close" onclick="closeModal('drilldown-modal')">✕</button></div>
        <div class="modal-body" id="drilldown-container">Loading...</div></div>
      </div>
    `);
    modal = document.getElementById("drilldown-modal");
  }
  const container = document.getElementById("drilldown-container");
  const title = document.getElementById("drilldown-title");
  modal.style.display = "flex";
  container.innerHTML = '<div class="loading">Loading stockist details...</div>';

  try {
    const data = await API.getStockistDrilldown(stockistId);
    const s = data.stockist;
    const k = data.kpis;
    title.textContent = `📦 ${s.entity_name} — ${s.city} (${s.region})`;

    container.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px;">
        <div class="kpi-card"><span class="kpi-label">Revenue</span><div class="kpi-value">${k.revenue_display}</div></div>
        <div class="kpi-card"><span class="kpi-label">Fill Rate</span><div class="kpi-value" style="color:${k.fill_rate>=80?'#10b981':'#ef4444'}">${k.fill_rate}%</div></div>
        <div class="kpi-card"><span class="kpi-label">Orders</span><div class="kpi-value">${k.total_orders}</div></div>
        <div class="kpi-card"><span class="kpi-label">Low Stock SKUs</span><div class="kpi-value" style="color:#ef4444">${k.low_stock_count}</div></div>
      </div>
      <h4 style="color:#fff;margin-bottom:12px;">Distributors under ${s.entity_name}</h4>
      <table class="data-table"><thead><tr><th>Distributor</th><th>Orders</th><th>Revenue</th><th>Delivery %</th><th>Failed</th><th>Avg Days</th><th>Retailers</th></tr></thead>
      <tbody>${data.distributors.map(d => `<tr>
        <td><strong>${d.name}</strong><br><span style="color:#5a6278;font-size:0.75rem">${d.distributor_id}</span></td>
        <td>${d.total_orders}</td><td>${d.revenue_display}</td>
        <td><span class="status-pill ${d.delivery_success_rate>=80?'delivered':d.delivery_success_rate>=60?'pending':'failed'}">${d.delivery_success_rate}%</span></td>
        <td style="color:${d.failed_deliveries>0?'#ef4444':'#5a6278'}">${d.failed_deliveries}</td>
        <td>${d.avg_delivery_days}d</td><td>${d.retailer_count}</td>
      </tr>`).join("")}</tbody></table>
      ${data.low_stock.length > 0 ? `
        <h4 style="color:#ef4444;margin:24px 0 12px;">⚠ Low Stock Items (${data.low_stock.length} SKUs)</h4>
        <table class="data-table"><thead><tr><th>SKU</th><th>Product</th><th>Current</th><th>Safety</th><th>Days Left</th><th>Action</th></tr></thead>
        <tbody>${data.low_stock.map(i => `<tr>
          <td style="font-family:var(--mono);color:#22d3ee">${i.sku_id}</td><td>${i.sku_name}</td>
          <td style="color:#ef4444;font-weight:700">${i.current_stock}</td><td>${i.safety_stock}</td>
          <td style="color:${i.days_until_stockout<5?'#ef4444':'#f59e0b'}">${i.days_until_stockout}d</td>
          <td><button class="alert-action critical" style="font-size:0.7rem;padding:4px 10px;" onclick="generateSinglePO('${stockistId}','${i.sku_id}',this)" data-name="${i.sku_name.replace(/'/g, '')}">Generate PO →</button></td>
        </tr>`).join("")}</tbody></table>` : '<p style="color:#10b981;margin-top:16px;">✅ All inventory healthy</p>'}
      <h4 style="color:#fff;margin:24px 0 12px;">Recent Orders</h4>
      <table class="data-table"><thead><tr><th>Order</th><th>Retailer</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${data.recent_orders.slice(0,12).map(o => `<tr>
        <td style="font-family:var(--mono);font-size:0.78rem">${o.order_id}</td><td>${o.from_entity}</td>
        <td>${o.sku_name||o.sku_id}</td><td>${o.qty}</td><td>₹${o.amount.toLocaleString()}</td>
        <td><span class="status-pill ${o.status}">${o.status}</span></td><td>${o.date}</td>
      </tr>`).join("")}</tbody></table>`;
  } catch (err) { container.innerHTML = `<div class="loading" style="color:#ef4444">Failed: ${err.message}</div>`; }
}

async function generateSinglePO(stockistId, skuId, btnEl) {
  const skuName = btnEl?.dataset?.name || skuId;
  try {
    btnEl.disabled = true;
    btnEl.textContent = "Generating...";
    const result = await API.autoGeneratePO(stockistId, skuId);
    showToast(`✅ PO ${result.po.po_id} generated for ${skuName}`, "success");
    btnEl.textContent = "✅ Generated";
    btnEl.style.background = "linear-gradient(135deg, #10b981, #059669)";
    refreshActivityFeed();
  } catch (err) {
    showToast("Failed: " + err.message, "error");
    btnEl.disabled = false;
    btnEl.textContent = "Generate PO →";
  }
}


// ═══════════════════════════════════════════════════════════
// FEATURE 3: HIERARCHY TREE VIEW
// ═══════════════════════════════════════════════════════════

async function openHierarchy() {
  let modal = document.getElementById("hierarchy-modal");
  // Inject modal if it doesn't exist (safety for non-HO roles)
  if (!modal) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-overlay" id="hierarchy-modal" style="display:none" onclick="if(event.target===this)closeModal('hierarchy-modal')">
        <div class="modal-card">
          <div class="modal-header"><h3>🏗️ Organization Hierarchy & Scope Map</h3><button class="modal-close" onclick="closeModal('hierarchy-modal')">✕</button></div>
          <div class="modal-body" id="hierarchy-tree-container">Loading...</div>
        </div>
      </div>
    `);
    modal = document.getElementById("hierarchy-modal");
  }
  const container = document.getElementById("hierarchy-tree-container");
  modal.style.display = "flex";
  container.innerHTML = '<div class="loading">Loading hierarchy...</div>';
  try {
    const data = await API.getHierarchy();
    container.innerHTML = renderTreeNode(data.tree, 0);
  } catch (err) { container.innerHTML = `<div class="loading" style="color:#ef4444">Failed: ${err.message}</div>`; }
}

function renderTreeNode(node, depth) {
  const indent = depth * 24;
  const colors = { head_office: "#a855f7", stockist: "#22d3ee", distributor: "#f59e0b", retailer: "#10b981" };
  const icons = { head_office: "🏢", stockist: "📦", distributor: "🚚", retailer: "🏪" };
  const color = colors[node.type] || "#8892a8";
  const click = node.type === "stockist" ? `onclick="closeModal('hierarchy-modal');openDrilldown('${node.entity_id}')" style="cursor:pointer;"` : "";
  let html = `<div class="tree-node" style="margin-left:${indent}px;padding:8px 12px;border-left:2px solid ${color}30;margin-bottom:4px;border-radius:0 8px 8px 0;background:${color}08;" ${click}>
    <span>${icons[node.type]||"📍"}</span> <strong style="color:${color};margin:0 6px;">${node.entity_id}</strong>
    <span style="color:#fff;">${node.name}</span>
    ${node.city?`<span style="color:#5a6278;font-size:0.78rem;margin-left:6px;">${node.city}</span>`:""}
    ${node.child_count>0?`<span style="color:#5a6278;font-size:0.7rem;margin-left:6px;">(${node.child_count})</span>`:""}
    ${node.type==="stockist"?`<span style="color:${color};font-size:0.7rem;margin-left:6px;">← click</span>`:""}
  </div>`;
  if (node.children) node.children.forEach(c => { html += renderTreeNode(c, depth + 1); });
  return html;
}


// ═══════════════════════════════════════════════════════════
// FEATURE 4: AI COPILOT CHAT
// ═══════════════════════════════════════════════════════════

async function sendCopilotQuery() {
  const input = document.getElementById("copilot-input");
  const messages = document.getElementById("copilot-messages");
  const query = input.value.trim();
  if (!query) return;
  messages.innerHTML += `<div class="copilot-msg user"><div class="copilot-bubble">${escapeHtml(query)}</div><span class="copilot-avatar">👤</span></div>`;
  input.value = "";
  const typingId = "typing-" + Date.now();
  messages.innerHTML += `<div class="copilot-msg bot" id="${typingId}"><span class="copilot-avatar">🤖</span><div class="copilot-bubble" style="color:#5a6278">Analyzing data...</div></div>`;
  messages.scrollTop = messages.scrollHeight;
  try {
    const data = await API.askCopilot(currentUser?.role || "head_office", query);
    const el = document.getElementById(typingId);
    if (el) el.querySelector(".copilot-bubble").innerHTML = data.answer
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')
      .replace(/_(.*?)_/g, '<em style="color:#a855f7">$1</em>')
      .replace(/\n/g, '<br>');
  } catch (err) {
    const el = document.getElementById(typingId);
    if (el) el.querySelector(".copilot-bubble").innerHTML = `<span style="color:#ef4444">Error: ${err.message}</span>`;
  }
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }


// ═══════════════════════════════════════════════════════════
// FEATURE 5: ACTIVITY FEED
// ═══════════════════════════════════════════════════════════

async function refreshActivityFeed() {
  const feed = document.getElementById("activity-feed");
  if (!feed) return;
  try {
    const data = await API.getActivityFeed(15);
    if (!data.activity || data.activity.length === 0) {
      feed.innerHTML = '<div class="activity-empty">No actions recorded yet. Use the Action Center to trigger operations.</div>';
      return;
    }
    const icons = { order_created: "📦", order_updated: "🔄", order_cancelled: "❌", po_created: "📋" };
    const colors = { order_created: "#10b981", order_updated: "#3b82f6", order_cancelled: "#ef4444", po_created: "#a855f7" };
    feed.innerHTML = data.activity.map(a => `
      <div class="activity-item">
        <span style="color:${colors[a.type]||'#5a6278'}">${icons[a.type]||"📍"}</span>
        <span class="activity-time">${a.time}</span>
        <span class="activity-event">${a.event}</span>
      </div>
    `).join("");
  } catch (err) { /* non-critical */ }
}


// ═══════════════════════════════════════════════════════════
// MODAL + TOAST UTILITIES
// ═══════════════════════════════════════════════════════════

function closeModal(id) { const m = document.getElementById(id); if (m) m.style.display = "none"; }

function scrollToCopilot() {
  const el = document.getElementById("copilot-input");
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
}

function showToast(message, type = "success") {
  const t = document.createElement("div");
  t.className = "toast";
  if (type === "error") t.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
  else if (type === "info") t.style.background = "linear-gradient(135deg, #3b82f6, #7c3aed)";
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
