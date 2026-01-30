/* =========================================================
   Velvet Room — Skin2 Inventory Page
   File: assets/js/inventorySkin2Page.js

   Step [4/6]: Supabase fetch + render
   - Source: v_bottle_inventory
   - Render into: #inventory-content
   - Status into: #status
   - Errors into: #error
   - Hyperlink: bottle_expression -> tastings/assets/barrel/index.html?single_barrel_id=...

   NOTE:
   - Step [5/6] will wire the text search to filter rendered rows.
   - This file focuses on: load + render + link building.
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

/**
 * Builds a hyperlink to your existing barrel popup page.
 * Opens in a new tab.
 */
function barrelLink(singleBarrelId, label) {
  const id = singleBarrelId ?? "";
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  // From your requirement: open tastings/assets/barrel/index.html in a new page
  const href = `tastings/assets/barrel/index.html?single_barrel_id=${encodeURIComponent(
    id
  )}`;

  return `<a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(
    text
  )}</a>`;
}

/**
 * Decide which columns to show.
 * You can tune this list once you confirm the view columns.
 */
function selectColumns(keys) {
  // Preferred columns (best guess)
  const preferred = [
    "bottle_expression",
    "brand_name",
    "bottle_type",
    "spirit_subtype",
    "size_ml",
    "msrp",
    "on_hand_qty",
    "location",
    "single_barrel_id",
  ];

  const cols = [];
  for (const k of preferred) if (keys.includes(k)) cols.push(k);

  // Add any remaining keys (keep it sane; we don’t want 40 columns)
  for (const k of keys) {
    if (!cols.includes(k)) cols.push(k);
    if (cols.length >= 12) break;
  }
  return cols;
}

/**
 * Render the inventory table.
 * Adds data attributes on rows so Step [5/6] can filter by text.
 */
function renderTable(rows) {
  if (!elContent) return;

  if (!rows || rows.length === 0) {
    elContent.innerHTML = `<div style="padding:12px;">No inventory rows returned.</div>`;
    return;
  }

  const keys = Object.keys(rows[0] || {});
  const cols = selectColumns(keys);

  const thead = cols
    .filter((c) => c !== "single_barrel_id") // we don’t show id as a column unless needed
    .map((c) => `<th title="${escapeHtml(c)}">${escapeHtml(labelize(c))}</th>`)
    .join("");

  const tbody = rows
    .map((r) => {
      // For search filtering: concatenate visible text into a searchable attribute
      // Step [5/6] can use this without re-walking every cell.
      const searchable = cols
        .map((c) => (r[c] == null ? "" : String(r[c])))
        .join(" | ")
        .toLowerCase();

      const tds = cols
        .filter((c) => c !== "single_barrel_id")
        .map((c) => {
          if (c === "bottle_expression") {
            return `<td>${barrelLink(r.single_barrel_id, r.bottle_expression)}</td>`;
          }
          return `<td>${escapeHtml(r[c])}</td>`;
        })
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elContent.innerHTML = `
    <div class="skin2-table-wrap">
      <table class="skin2-table" aria-label="Bottle inventory table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}

async function loadInventory() {
  clearError();
  setStatus("Loading inventory…");

  try {
    // NOTE: Views can be large. Start with a sane cap.
    // If you need pagination later, we can add it without touching your existing pages.
    const { data, error } = await supabase.from(VIEW_NAME).select("*").limit(1000);

    if (error) throw error;

    renderTable(data);

    setStatus(`Loaded ${data?.length ?? 0} rows`);
  } catch (e) {
    setStatus("Error loading inventory");
    showError("Failed to load v_bottle_inventory from Supabase.", e);
    if (elContent) elContent.innerHTML = "";
  }
}

// Kick off
loadInventory();
