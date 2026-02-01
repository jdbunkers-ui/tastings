/* =========================================================
   Velvet Room — Skin2 Inventory Page
   File: assets/js/inventorySkin2Page.js
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

function isNumberLike(v) {
  if (v == null) return false;
  const n = Number(v);
  return Number.isFinite(n);
}

function fmtMoney(v) {
  if (!isNumberLike(v)) return escapeHtml(v);
  return `$${Number(v).toFixed(2)}`;
}

function fmt1(v) {
  if (!isNumberLike(v)) return escapeHtml(v);
  return Number(v).toFixed(1);
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  if (n < 1.0) return "NAS";
  return n.toFixed(1);
}

/**
 * Bottle Expression hyperlink
 * index_skin2.html is at root; target page is assets/barrel/index.html
 */
function barrelLink(singleBarrelId, label) {
  const id = singleBarrelId ?? "";
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  // ✅ Skin2 barrel page
  const href = `assets/barrel/index_skin2.html?single_barrel_id=${encodeURIComponent(id)}`;

  return `<a class="skin2-link" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    text
  )}</a>`;
}

/**
 * Distillery Name hyperlink
 * index_skin2.html is at root; target page is assets/distillery/index.html
 */
function distilleryLink(distilleryId, label) {
  const id = distilleryId ?? "";
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `assets/distillery/index.html?distillery_id=${encodeURIComponent(id)}`;

  return `<a class="skin2-link" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    text
  )}</a>`;
}

function headerLabel(col) {
  const map = {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    bottle_expression: "Bottle Expression",
    distillery_name: "Distillery Name",
    state: "State",
  };
  return map[col] || col;
}

function selectColumns(keys) {
  const desired = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "distillery_name",
    "state",
    "single_barrel_id",
    "distillery_id", // ✅ add this
  ];

function renderCell(col, row) {
  const v = row[col];

  if (col === "bottle_expression") return barrelLink(row.single_barrel_id, row.bottle_expression);
  if (col === "distillery_name") return distilleryLink(row.distillery_id, row.distillery_name); // ✅ add

  if (col === "msrp") return fmtMoney(v);
  if (col === "score") return fmt1(v);
  if (col === "proof") return fmt1(v);
  if (col === "age") return fmtAge(v);

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
const displayCols = cols.filter((c) => c !== "single_barrel_id" && c !== "distillery_id");

  const thead = displayCols
    .map((c) => `<th title="${escapeHtml(c)}">${escapeHtml(headerLabel(c))}</th>`)
    .join("");

  // Keep search string small and stable
  const searchableFields = [
  "bottle_expression",
  "distillery_name",
  "state",
  "single_barrel_id",
  "distillery_id", // ✅ optional
];
  const tbody = rows
    .map((r) => {
      const searchable = searchableFields
        .filter((c) => c in r)
        .map((c) => (r[c] == null ? "" : String(r[c])))
        .join(" | ")
        .toLowerCase();

      const tds = displayCols.map((c) => `<td>${renderCell(c, r)}</td>`).join("");
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
