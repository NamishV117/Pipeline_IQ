/**
 * Shared action handler for buttons across all views.
 */
function handleAction(key) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = `✅ Action triggered: ${key.replace(/_/g, " ")}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
