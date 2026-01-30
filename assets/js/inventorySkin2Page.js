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
  if (!id) return escapeHtml(text);

  const href = `assets/barrel/index.html?single_barrel_id=${encodeURIComponent(id)}`;


   
  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    text
  )}</a>`;
}

function selectColumns(keys) {
  const preferred = [
    "bottle_expression",
    "brand_name",
    "bottle_type",
    "spirit_subtype",
    "size_ml",
    "msrp",
    "on_hand_qty",
    "location",
    "single_barrel_id", // used for link
  ];

  const cols = [];
  for (const k of preferred) if (keys.includes(k)) cols.push(k);

  for (const k of keys) {
    if (!cols.includes(k)) cols.push(k);
    if (cols.length >= 12) break;
  }
  return cols;
}

function renderCell(col, row) {
  const v = row[col];

  if (col === "bottle_expression") {
    return barrelLink(row.single_barrel_id, row.bottle_expression);
  }
  if (col === "msrp") return fmtMoney(v);
  if (col === "size_ml") return fmtInt(v);
  if (col === "on_hand_qty") return fmtInt(v);

  return escapeHtml(v);
}

function renderTable(rows) {
  if (!elContent) return;

  if (!rows || rows.length === 0) {
    elContent.innerHTML = `<div style="padding:12px;">No inventory rows returned.</div>`;
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
    return;
  }

  const keys = Object.keys(rows[0] || {});
  const cols = selectColumns(keys);
  const displayCols = cols.filter((c) => c !== "single_barrel_id");

  const thead = displayCols
    .map((c) => `<th title="${escapeHtml(c)}">${escapeHtml(labelize(c))}</th>`)
    .join("");

  const searchableFields = [
    "bottle_expression",
    "brand_name",
    "bottle_type",
    "spirit_subtype",
    "location",
    "single_barrel_id",
  ];

  const tbody = rows
    .map((r) => {
      const searchable = searchableFields
        .filter((c) => c in r)
        .map((c) => (r[c] == null ? "" : String(r[c])))
        .join(" | ")
        .toLowerCase();

      const tds = displayCols
        .map((c) => `<td>${renderCell(c, r)}</td>`)
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elContent.innerHTML = `
    <table class="skin2-table" aria-label="Bottle inventory table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;

  window.dispatchEvent(new Event("skin2:inventoryRendered"));
}

async function loadInventory() {
  clearError();
  setStatus("Loading inventory…");

  try {
    const { data, error } = await supabase.from(VIEW_NAME).select("*").limit(300);
    if (error) throw error;

    renderTable(data);
    setStatus(`Loaded ${data?.length ?? 0} rows`);
  } catch (e) {
    setStatus("Error loading inventory");
    showError("Failed to load v_bottle_inventory from Supabase.", e);
    if (elContent) elContent.innerHTML = "";
  }
}

loadInventory();
