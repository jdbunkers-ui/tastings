/* =========================================================
   Honey Barrel Hunter — Skin2 Sensory Page
   File: assets/js/sensory-page.js
   Depends on: assets/js/supabaseClient.js
   Notes:
   - Reuses inventory-filter.js (expects #filter + rows with data-search)
   - Renders one row per tasting from public.v_sensory
   - Adds a star next to bottle when row.new_update = true
   - Adds a toggle (from sensory/index.html) to filter rows where new_update = true
   ========================================================= */

import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_sensory";
const ROW_LIMIT = 500; // adjust if needed

// DOM
const elContent = document.getElementById("sensory-content");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");

// Toggle state (set by sensory/index.html)
let sensoryOnlyNew = !!(window.HBH_SensoryFilter && window.HBH_SensoryFilter.onlyNew);

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

function fmt(v, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function cleanNotes(v) {
  // Preserve your [[emphasis]] tokens for later styling if you want.
  // For now, just normalize whitespace.
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Link to bottle page
 * sensory/index.html -> ../bottles/index.html
 */
function barrelLink(singleBarrelId, label) {
  const id = (singleBarrelId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

function headerLabel(col) {
  const map = {
    bottle_expression: "Bottle",
    nose_notes: "Nose Notes",
    palate_notes: "Palate Notes",
    finish_notes: "Finish Notes",
  };
  return map[col] || col;
}

function sensoryColClass(col) {
  const map = {
    bottle_expression: "col-expression",
    nose_notes: "col-notes",
    palate_notes: "col-notes",
    finish_notes: "col-notes",
  };
  return map[col] || "";
}

/** Spinning star image (reuses your existing asset) */
function newUpdateStarImg(altText = "New tasting") {
  return `
    <img
      src="../assets/img/logo/gold_spinning_star.gif"
      alt="${escapeHtml(altText)}"
      style="height:18px; vertical-align:middle; margin-left:6px;"
    />
  `;
}

function renderCell(col, row) {
  if (col === "bottle_expression") {
    const link = barrelLink(
      row.single_barrel_id,
      fmt(row.bottle_expression, "(unknown bottle)")
    );

    // ⭐ Add star next to bottle when this tasting row is marked new_update
    const star = row.new_update ? newUpdateStarImg("New update") : "";
    return `${link}${star}`;
  }

  if (col === "nose_notes") return escapeHtml(fmt(cleanNotes(row.nose_notes)));
  if (col === "palate_notes") return escapeHtml(fmt(cleanNotes(row.palate_notes)));
  if (col === "finish_notes") return escapeHtml(fmt(cleanNotes(row.finish_notes)));

  return escapeHtml(row[col]);
}

function renderTable(rows) {
  if (!elContent) return;

  if (!rows || rows.length === 0) {
    elContent.innerHTML = `<div style="padding:12px;">No sensory rows returned.</div>`;
    window.dispatchEvent(new Event("skin2:inventoryRendered")); // reuse same hook name
    return;
  }

  // Columns to display (keep ids for searching / linking but not displayed)
  const displayCols = ["bottle_expression", "nose_notes", "palate_notes", "finish_notes"];

  const thead = displayCols
    .map((c) => {
      const cls = sensoryColClass(c);
      return `<th class="${escapeHtml(cls)}" title="${escapeHtml(c)}">${escapeHtml(
        headerLabel(c)
      )}</th>`;
    })
    .join("");

  // What should be searchable in the filter bar
  const searchableFields = [
    "bottle_expression",
    "nose_notes",
    "palate_notes",
    "finish_notes",
    "single_barrel_id",
    "tasting_id",
  ];

  const tbody = rows
    .map((r) => {
      const searchable = searchableFields
        .filter((c) => c in r)
        .map((c) => (r[c] == null ? "" : String(r[c])))
        .join(" | ")
        .toLowerCase();

      const tds = displayCols
        .map((c) => {
          const cls = sensoryColClass(c);
          return `<td class="${escapeHtml(cls)}">${renderCell(c, r)}</td>`;
        })
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elContent.innerHTML = `
    <table class="skin2-table" aria-label="Sensory notes table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>

    <style>
      /* Minor readability tweaks for long notes */
      td.col-notes{
        white-space: normal;
        line-height: 1.35;
        max-width: 520px;
      }
      td.col-expression{
        white-space: nowrap;
      }
    </style>
  `;

  // inventory-filter.js listens for this event name in your setup
  window.dispatchEvent(new Event("skin2:inventoryRendered"));
}

async function loadSensory() {
  clearError();
  setStatus(sensoryOnlyNew ? "Loading sensory notes (recent only)…" : "Loading sensory notes…");

  try {
    // Pull one row per tasting (your view already does that)
    // Prefer stable ordering by tasting_id if present.
    let q = supabase
      .from(VIEW_NAME)
      .select("*");

    // ✅ Toggle-driven filter (boolean)
    if (sensoryOnlyNew) {
      q = q.eq("new_update", true);
    }

    const { data, error } = await q
      .order("tasting_id", { ascending: false })
      .limit(ROW_LIMIT);

    if (error) throw error;

    renderTable(data);
    setStatus(`Loaded ${data?.length ?? 0} rows`);
  } catch (e) {
    setStatus("Error loading sensory notes");
    showError("Failed to load v_sensory from Supabase.", e);
    if (elContent) elContent.innerHTML = "";
  }
}

// Listen for the star toggle event dispatched by sensory/index.html
function wireSensoryToggle() {
  window.addEventListener("hbh:sensoryFilterChanged", (e) => {
    const onlyNew = !!(e && e.detail && e.detail.onlyNew);
    if (onlyNew === sensoryOnlyNew) return;
    sensoryOnlyNew = onlyNew;
    loadSensory();
  });
}

// Boot
wireSensoryToggle();

// Re-read once in case order of scripts differs
sensoryOnlyNew = !!(window.HBH_SensoryFilter && window.HBH_SensoryFilter.onlyNew);

loadSensory();
