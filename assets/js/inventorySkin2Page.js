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
const elFlightTickerMount = document.getElementById("flightTickerMount");

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
 * index_skin2.html is at root; target page is assets/barrel/index_skin2.html
 */
function barrelLink(singleBarrelId, label) {
  const id = singleBarrelId ?? "";
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `assets/barrel/index_skin2.html?single_barrel_id=${encodeURIComponent(
    id
  )}`;

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

  const href = `assets/distillery/index.html?distillery_id=${encodeURIComponent(
    id
  )}`;

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
  // EXACT order requested + keep ids for links (hidden)
  const desired = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "distillery_name",
    "state",
    "single_barrel_id",
    "distillery_id",
  ];
  return desired.filter((k) => keys.includes(k));
}

function renderCell(col, row) {
  const v = row[col];

  if (col === "bottle_expression") {
    return barrelLink(row.single_barrel_id, row.bottle_expression);
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

  const keys = Object.keys(rows[0] || {});
  const cols = selectColumns(keys);

  // Hide technical ids from display (but keep them in the row object)
  const displayCols = cols.filter(
    (c) => c !== "single_barrel_id" && c !== "distillery_id"
  );

  const thead = displayCols
    .map((c) => `<th title="${escapeHtml(c)}">${escapeHtml(headerLabel(c))}</th>`)
    .join("");

  // Keep search string small and stable
  const searchableFields = [
    "bottle_expression",
    "distillery_name",
    "state",
    "single_barrel_id",
    "distillery_id",
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

/* =========================================================
   Flight Fight Ticker (Inventory only)
   ========================================================= */

async function initFlightTickerInventoryOnly() {
  if (!elFlightTickerMount) return;

  const { data, error } = await supabase
    .from("v_flight_ticker")
    .select("flight_id, flight_date, flight_name, bottle_expression, score");

  if (error || !data || data.length === 0) return;

  const { flight_id, flight_date, flight_name } = data[0];

  // Show once per completed flight
  const tickerKey = `${flight_id}|${flight_date}`;
  const seenKey = localStorage.getItem("vv_seen_flight_ticker_key");
  if (seenKey === tickerKey) return;

  elFlightTickerMount.style.display = "";
  elFlightTickerMount.innerHTML = buildFlightTickerHtml({
    flight_id,
    flight_date,
    flight_name,
    rows: data,
  });

  // Entire banner clickable
  const banner = elFlightTickerMount.querySelector(".flight-ticker");
  banner.addEventListener("click", () => {
    // Page will exist next phase — wire now
    window.location.href = `assets/flight_fights/index.html?flight_id=${flight_id}`;
  });

  // Dismiss
  const closeBtn = elFlightTickerMount.querySelector(".flight-ticker__close");
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    localStorage.setItem("vv_seen_flight_ticker_key", tickerKey);
    elFlightTickerMount.style.display = "none";
    elFlightTickerMount.innerHTML = "";
  });
}

function buildFlightTickerHtml({ flight_date, flight_name, rows }) {
  const safe = (v) =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const flightLabel = `${flight_name} (${flight_date})`;

  const body = rows
    .slice(0, 4)
    .map((r, i) => {
      return `
        <div class="flight-ticker__row">
          <div class="flight-ticker__rank">${i + 1}</div>
          <div class="flight-ticker__bottle">${safe(r.bottle_expression)}</div>
          <div class="flight-ticker__score">${safe(r.score)}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="flight-ticker" role="button" tabindex="0">
      <button class="flight-ticker__close" type="button" aria-label="Dismiss">×</button>

      <div class="flight-ticker__top">
        <div class="flight-ticker__title">FLIGHT FIGHT COMPLETE</div>
        <div class="flight-ticker__flight pulse-gold">${safe(flightLabel)}</div>
      </div>

      <div class="flight-ticker__table">
        ${body}
      </div>

      <div class="flight-ticker__cta">Click to view</div>
    </div>
  `;
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

initFlightTickerInventoryOnly();
loadInventory();
