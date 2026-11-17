/* ── EcoTrack shared utilities ───────────────────────── */
"use strict";

const API_BASE = "/api";

/* Inject SVG icon sprite so <use href="#icon-x"> works on every page */
(function injectIconSprite() {
  if (document.getElementById("ecotrack-icons")) return;
  fetch("/images/icons.svg")
    .then(function (r) { return r.text(); })
    .then(function (html) {
      var div = document.createElement("div");
      div.id = "ecotrack-icons";
      div.setAttribute("aria-hidden", "true");
      div.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
      div.innerHTML = html;
      document.body.insertBefore(div, document.body.firstChild);
    })
    .catch(function () {});
})();

/* SVG icon helper */
function icon(name, extraClass) {
  return '<svg class="icon' + (extraClass ? " " + extraClass : "") +
    '" aria-hidden="true" focusable="false"><use href="/images/icons.svg#icon-' + name + '"></use></svg>';
}

/* Fetch wrapper */
async function apiFetch(path, options) {
  options = options || {};
  var isFormData = options.body instanceof FormData;
  var response = await fetch(API_BASE + path, {
    credentials: "include",
    headers: Object.assign(
      {},
      !isFormData ? { "Content-Type": "application/json" } : {},
      options.headers || {}
    ),
    method: options.method || "GET",
    body: options.body,
  });

  var contentType = response.headers.get("content-type") || "";
  var payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    var message = typeof payload === "string" ? payload : (payload.message || "Request failed.");
    throw new Error(message);
  }
  return payload;
}

/* Show inline alert */
function showMessage(elementId, message, type) {
  var node = document.getElementById(elementId);
  if (!node) return;
  node.className = "alert alert-" + (type || "success");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(node._t);
  node._t = setTimeout(function () { node.hidden = true; }, 6000);
}

/* Logout */
function logoutUser() {
  apiFetch("/auth/logout", { method: "POST" })
    .then(function () { window.location.href = "/login.html"; })
    .catch(function () { window.location.href = "/login.html"; });
}

/* Profile card renderer */
function renderUserSummary(parentId, user) {
  var root = document.getElementById(parentId);
  if (!root || !user) return;
  root.innerHTML =
    '<div class="profile-card">' +
      '<div class="profile-avatar">' + escapeHTML(user.name.charAt(0).toUpperCase()) + "</div>" +
      '<div class="profile-info">' +
        "<strong>" + escapeHTML(user.name) + "</strong>" +
        "<span>" + escapeHTML(user.role.charAt(0).toUpperCase() + user.role.slice(1)) + " Account</span>" +
      "</div>" +
    "</div>" +
    '<div class="profile-details-grid" style="margin-top:1.25rem;">' +
      '<div class="profile-field"><label>Email</label><p>' + escapeHTML(user.email) + "</p></div>" +
      '<div class="profile-field"><label>Phone</label><p>' + escapeHTML(user.phone || "—") + "</p></div>" +
      '<div class="profile-field"><label>Location</label><p>' + escapeHTML(user.location || "—") + "</p></div>" +
      '<div class="profile-field"><label>Member Since</label><p>' + new Date(user.createdAt).toLocaleDateString() + "</p></div>" +
    "</div>";
}

/* HTML escape */
function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

/* Status badge */
function formatStatusBadge(status) {
  var map = {
    Pending:      "pending",
    Approved:     "approved",
    Assigned:     "assigned",
    "In Progress":"in-progress",
    Completed:    "completed",
    Rejected:     "rejected",
    active:       "active",
    inactive:     "inactive",
  };
  var s = String(status || "Unknown");
  return '<span class="badge ' + (map[s] || "") + '">' + escapeHTML(s) + "</span>";
}

/* Wire logout buttons */
function setupLogoutButtons() {
  document.querySelectorAll("[data-logout]").forEach(function (el) {
    el.addEventListener("click", logoutUser);
  });
}

document.addEventListener("DOMContentLoaded", setupLogoutButtons);
