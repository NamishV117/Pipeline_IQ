/**
 * PipelineIQ — Main SPA Router & State Manager
 * Top-nav layout with role-based routing.
 */

let currentUser = null;
let currentEntity = null;

const ROLE_CONFIG = {
  head_office:  { label: "HEAD OFFICE",  icon: "🏢", color: "#a855f7", abbr: "HO" },
  stockist:     { label: "STOCKIST",     icon: "📦", color: "#22d3ee", abbr: "ST" },
  distributor:  { label: "DISTRIBUTOR",  icon: "🚚", color: "#f59e0b", abbr: "DI" },
  retailer:     { label: "RETAILER",     icon: "🏪", color: "#10b981", abbr: "RT" },
};

// ── Login ──
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  try {
    const data = await API.login(username, password);
    currentUser = data.user;
    currentEntity = data.entity;
    showDashboard();
  } catch (err) {
    errorEl.textContent = "Invalid username or password.";
    errorEl.style.display = "block";
  }
}

function handleLogout() {
  currentUser = null;
  currentEntity = null;
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("dashboard-screen").style.display = "none";
}

// ── Dashboard Routing ──
async function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard-screen").style.display = "flex";

  const config = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.head_office;
  const entityName = currentEntity ? currentEntity.entity_name : currentUser.name;
  const city = currentEntity ? currentEntity.city : "";
  const region = currentEntity ? currentEntity.region : "";

  // Top bar user info
  document.getElementById("topbar-user-name").textContent = currentUser.name;
  document.getElementById("topbar-entity-info").textContent = `${entityName} — ${region}`;

  const avatarEl = document.getElementById("topbar-avatar");
  avatarEl.textContent = config.abbr;
  avatarEl.style.background = `linear-gradient(135deg, ${config.color}, ${config.color}99)`;

  const badge = document.getElementById("topbar-role-badge");
  badge.textContent = config.label;
  badge.style.color = config.color;
  badge.style.background = config.color + "18";
  badge.style.border = `1px solid ${config.color}40`;

  // Scope bar
  document.getElementById("scope-user-name").textContent = currentUser.name;
  document.getElementById("scope-role-label").textContent = config.label;
  document.getElementById("scope-region").textContent = `${entityName} — ${region}`;
  document.getElementById("scope-parent").textContent = currentEntity?.parent_id || "National Board";

  // Role-based nav button visibility
  // Hierarchy & AI Insights: Head Office only. Guided Tour: all roles (role-aware content).
  const isHO = currentUser.role === "head_office";
  const hBtn = document.getElementById("nav-hierarchy-btn");
  const iBtn = document.getElementById("nav-insights-btn");
  if (hBtn) hBtn.style.display = isHO ? "" : "none";
  if (iBtn) iBtn.style.display = isHO ? "" : "none";

  // Load view
  const container = document.getElementById("main-content");
  container.innerHTML = '<div class="loading">Loading dashboard...</div>';

  switch (currentUser.role) {
    case "head_office":
      await renderHeadOffice(container);
      break;
    case "stockist":
      await renderStockist(container);
      break;
    case "distributor":
      await renderDistributor(container);
      break;
    case "retailer":
      await renderRetailer(container);
      break;
    default:
      container.innerHTML = '<div class="placeholder"><h2>Unknown Role</h2></div>';
  }
}

// ── Quick Login ──
function quickLogin(username, password) {
  document.getElementById("login-username").value = username;
  document.getElementById("login-password").value = password;
  document.getElementById("login-form").dispatchEvent(new Event("submit"));
}

// ── Role Switcher (Demo) ──
const ROLE_CREDS = {
  headoffice: { username: "headoffice", password: "admin123" },
  mumbai_stk: { username: "mumbai_stk", password: "stock123" },
  andheri_dist: { username: "andheri_dist", password: "dist123" },
  quickmart: { username: "quickmart", password: "retail123" },
};

async function switchRole(key) {
  if (!key) return;
  const cred = ROLE_CREDS[key];
  if (!cred) return;
  try {
    const data = await API.login(cred.username, cred.password);
    currentUser = data.user;
    currentEntity = data.entity;
    showDashboard();
    // Reset dropdown
    const sel = document.getElementById("role-switcher");
    if (sel) sel.value = "";
  } catch (err) {
    showToast("Failed to switch role: " + err.message, "error");
  }
}

// ── Theme Toggle ──
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("pipelineiq-theme", next);
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) btn.textContent = next === "dark" ? "🌙" : "☀️";
}

// ── Init ──
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  // Restore saved theme
  const savedTheme = localStorage.getItem("pipelineiq-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  const tBtn = document.getElementById("theme-toggle-btn");
  if (tBtn) tBtn.textContent = savedTheme === "dark" ? "🌙" : "☀️";
});
