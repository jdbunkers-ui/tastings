/* =========================================================
   Honey Barrel Hunter — Skin2 Inventory Page
   File: assets/js/inventory-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

const VIEW_NAME = "v_bottle_inventory";
const ROW_LIMIT = 300;

// ---------- DOM ----------
const elContent = document.getElementById("inventory-content");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");

// Toggle state (set by inventory/index.html)
let inventoryOnlyNew = !!(
  window.HBH_InventoryFilter && window.HBH_InventoryFilter.onlyNew
);

// ---------- Helpers ----------
function show(el, isShown) {
  if (!el) return;
  el.style.display = isShown ? "" : "none";
}

function showError(message, details) {
  if (!elError) return;
  show(elError, true);
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
  show(elError, false);
  elError.textContent = "";
}

function setStatus(text) {
  if (!elStatus) return;
  elStatus.textContent = text ?? "";
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
  if (!isNumberLike(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function fmt1(v) {
  if (!isNumberLike(v)) return "—";
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
 * Adds GA tracking metadata dynamically from row values.
 */
function barrelLink(singleBarrelId, label) {
  const id = (singleBarrelId ?? "").toString().trim();
  const text = (label ?? "").toString().trim();
  if (!id) return escapeHtml(text);

  const href = `../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}`;

  return `
    <a
      class="skin2-link"
      href="${href}"
      data-analytics="single-barrel-click"
      data-single-barrel-id="${escapeHtml(id)}"
      data-bottle-name="${escapeHtml(text || id)}"
    >${escapeHtml(text || id)}</a>
  `;
}

/**
 * Distillery Name hyperlink
 */
function distilleryLink(distilleryId, label) {
  const id = (distilleryId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../distilleries/index.html?distillery_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

function headerLabel(col) {
  const map = {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    bottle_expression: "Bottle Expression",
    distillery_name: "Distillery Name",
  };
  return map[col] || col;
}

/**
 * Column classes so CSS can target specific columns.
 */
function invColClass(col) {
  const map = {
    score: "col-score",
    msrp: "col-msrp",
    proof: "col-proof",
    age: "col-age",
    bottle_expression: "col-expression",
    distillery_name: "col-distillery",
  };
  return map[col] || "";
}

function selectColumns(keys) {
  return [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "distillery_name",

    // hidden / utility
    "single_barrel_id",
    "distillery_id",
    "barrel_picker_id",
    "blender_id",
    "blender_name",
    "barrel_picker_name",
    "new_update",
  ].filter((k) => keys.includes(k));
}

function renderCell(col, row) {
  const v = row[col];

  if (col === "bottle_expression") {
    const star = row.new_update
      ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
      : "";
    return `${star}${barrelLink(row.single_barrel_id, row.bottle_expression)}`;
  }

  if (col === "distillery_name") {
    return distilleryLink(row.distillery_id, row.distillery_name);
  }

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

  const cols = selectColumns(Object.keys(rows[0] || {}));
  const displayCols = cols.filter(
    (c) =>
      ![
        "single_barrel_id",
        "distillery_id",
        "barrel_picker_id",
        "blender_id",
        "blender_name",
        "barrel_picker_name",
        "new_update",
      ].includes(c)
  );

  const thead = displayCols
    .map((c) => {
      const cls = invColClass(c);
      return `<th class="${cls}">${escapeHtml(headerLabel(c))}</th>`;
    })
    .join("");

  const searchableFields = [
    "bottle_expression",
    "distillery_name",
    "barrel_picker_name",
    "single_barrel_id",
    "distillery_id",
    "barrel_picker_id",
    "blender_name",
  ];

  const tbody = rows
    .map((r) => {
      const searchable = searchableFields
        .filter((k) => k in r)
        .map((k) => (r[k] == null ? "" : String(r[k])))
        .join(" | ")
        .toLowerCase();

      const tds = displayCols
        .map((c) => {
          const cls = invColClass(c);
          return `<td class="${cls}">${renderCell(c, r)}</td>`;
        })
        .join("");

      return `<tr
        class="inv-row"
        data-search="${escapeHtml(searchable)}"
        data-proof="${escapeHtml(r.proof)}"
      >${tds}</tr>`;
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
  setStatus(
    inventoryOnlyNew ? "Loading inventory (recent only)…" : "Loading inventory…"
  );

  try {
    let q = supabase.from(VIEW_NAME).select("*");

    if (inventoryOnlyNew) {
      q = q.eq("new_update", true);
    }

    const { data, error } = await q.limit(ROW_LIMIT);
    if (error) throw error;

    renderTable(data || []);
    setStatus(`Loaded ${data?.length ?? 0} rows`);
  } catch (e) {
    setStatus("Error loading inventory");
    showError("Failed to load v_bottle_inventory from Supabase.", e);
    if (elContent) elContent.innerHTML = "";
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
  }
}

function wireInventoryToggle() {
  window.addEventListener("hbh:inventoryFilterChanged", (e) => {
    const onlyNew = !!(e && e.detail && e.detail.onlyNew);
    if (onlyNew === inventoryOnlyNew) return;
    inventoryOnlyNew = onlyNew;
    loadInventory();
  });
}

wireInventoryToggle();

inventoryOnlyNew = !!(
  window.HBH_InventoryFilter && window.HBH_InventoryFilter.onlyNew
);

loadInventory();
