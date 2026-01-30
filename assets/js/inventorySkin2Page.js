/* =========================================================
   Velvet Room — Skin2 Inventory Page
   File: assets/js/inventorySkin2Page.js

   - Source: v_bottle_inventory
   - Render into: #inventory-content
   - Status into: #status
   - Errors into: #error
   - Hyperlink: bottle_expression -> tastings/assets/barrel/index.html?single_barrel_id=...

   ========================================================= */

import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_bottle_inventory";

// DOM
const elContent = document.getElementById("inventory-content");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");

function showError(message, details) {
  if (!elError) return;
  elError.style.display = "block";
  const extra =
    details && typeof details === "object"
      ? `\n\n${JSON.stringify(details, null, 2)}`
      : details
      ? `\n\n${String(details)}`
      : "";
  elError.textContent = `${message}${extra}`;
}

function clearError() {
  if (!elError) return;
  elError.style.display = "none";
  elError.textContent = "";
}

function setStatus(text) {
  if (!elStatus) return;
  elStatus.textContent = text;
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function labelize(key) {
  return String(key ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isNumberLike(v) {
  if (v == null) return false;
  const n = Number(v);
  return Number.isFinite(n);
}

function fmtMoney(v) {
  if (!isNumberLike(v)) return escapeHtml(v);
  const n = Number(v);
  return `$${n.toFixed(2)}`;
}

function fmtInt(v) {
  if (!isNumberLike(v)) return escapeHtml(v);
  return String(Math.round(Number(v)));
}

/**
 * bottle_expression links by single_barrel_id to barrel page
 */
function barrelLink(singleBarrelId, label) {
  const id = singleBarrelId ?? "";
  const text = label ?? "";
  if (!id) return escapeHtml
