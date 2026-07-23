/**
 * Unified API wrapper — all backend calls go through here.
 * Members 2, 3, 4 use these functions in their views.
 */
const API_BASE_URL = window.location.origin + "/api";

const API = {
  // ── Auth (Member 2) ──
  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    return await res.json();
  },

  // ── Analytics (Member 1) ──
  async getHeadOfficeAnalytics() {
    const res = await fetch(`${API_BASE_URL}/analytics/head-office`);
    return await res.json();
  },

  async getDistributorScorecard(stockistId = "") {
    const url = stockistId
      ? `${API_BASE_URL}/analytics/distributor-scorecard?stockist_id=${stockistId}`
      : `${API_BASE_URL}/analytics/distributor-scorecard`;
    const res = await fetch(url);
    return await res.json();
  },

  // ── Orders (Members 3 & 4) ──
  async getOrders(entityId = "", role = "", days = 90) {
    const params = new URLSearchParams();
    if (entityId) params.set("entity_id", entityId);
    if (role) params.set("role", role);
    params.set("days", days);
    const res = await fetch(`${API_BASE_URL}/orders?${params}`);
    return await res.json();
  },

  async createOrder(orderData) {
    const res = await fetch(`${API_BASE_URL}/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    return await res.json();
  },

  async dispatchOrder(orderId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/dispatch`, {
      method: "PATCH",
    });
    return await res.json();
  },

  async deliverOrder(orderId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/deliver`, {
      method: "PATCH",
    });
    return await res.json();
  },

  async cancelOrder(orderId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: "DELETE",
    });
    return await res.json();
  },

  async autoGeneratePO(stockistId, sku) {
    const res = await fetch(
      `${API_BASE_URL}/orders/po/auto-generate?stockist_id=${stockistId}&sku=${sku}`,
      { method: "POST" }
    );
    return await res.json();
  },

  async getPurchaseOrders(stockistId = "") {
    const url = stockistId
      ? `${API_BASE_URL}/orders/po?stockist_id=${stockistId}`
      : `${API_BASE_URL}/orders/po`;
    const res = await fetch(url);
    return await res.json();
  },

  async getActivityFeed(limit = 20) {
    const res = await fetch(`${API_BASE_URL}/orders/activity?limit=${limit}`);
    return await res.json();
  },

  // ── Drill-Down (Member 1) ──
  async getStockistDrilldown(stockistId) {
    const res = await fetch(`${API_BASE_URL}/analytics/stockist/${stockistId}`);
    return await res.json();
  },

  // ── Hierarchy (Member 1) ──
  async getHierarchy() {
    const res = await fetch(`${API_BASE_URL}/analytics/hierarchy`);
    return await res.json();
  },

  // ── AI Copilot (Member 1) ──
  async askCopilot(role, query) {
    const res = await fetch(`${API_BASE_URL}/analytics/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, query }),
    });
    return await res.json();
  },

  // ── Invoice (Member 4) ──
  async getInvoice(orderId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice`);
    return await res.json();
  },
};
