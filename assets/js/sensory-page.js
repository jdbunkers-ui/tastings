/* =========================================================
   Honey Barrel Hunter — Skin2 Sensory Page
   File: assets/js/sensory-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_sensory";
const ROW_LIMIT = 500;

// DOM
const elContent = document.getElementById("sensory-content");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");

// Toggle state
let sensoryOnlyNew = !!(
  window.HBH_SensoryFilter &&
  window.HBH_SensoryFilter.onlyNew
);

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
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/* =========================================================
   Bottle hyperlink + GA tracking
   ========================================================= */
function barrelLink(singleBarrelId, label) {
  const id = (singleBarrelId ?? "").toString().trim();
  const text = (label ?? "").toString().trim();

  if (!id) return escapeHtml(text);

  const href =
    `../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}`;

  return `
    <a
      class="skin2-link"
      href="${href}"
      data-analytics="single-barrel-click"
      data-single-barrel-id="${escapeHtml(id)}"
      data-bottle-name="${escapeHtml(text || id)}"
    >
      ${escapeHtml(text || id)}
    </a>
  `;
}

function headerLabel(col) {
  return (
    {
      bottle_expression: "Bottle",
      nose_notes: "Nose Notes",
      palate_notes: "Palate Notes",
      finish_notes: "Finish Notes",
    }[col] || col
  );
}

function sensoryColClass(col) {
  return (
    {
      bottle_expression: "col-sensory-bottle",
      nose_notes: "col-notes",
      palate_notes: "col-notes",
      finish_notes: "col-notes",
      score: "col-score",
    }[col] || ""
  );
}

function newUpdateStarImg(altText = "New tasting") {
  return `
    <img
      src="../assets/img/logo/gold_spinning_star.gif"
      alt="${escapeHtml(altText)}"
      style="height:18px; vertical-align:middle; margin-right:6px;"
    />
  `;
}

function renderCell(col, row) {
  if (col === "bottle_expression") {
    const link = barrelLink(
      row.single_barrel_id,
      fmt(row.bottle_expression, "(unknown bottle)")
    );

    const star = row.new_update
      ? newUpdateStarImg("New update")
      : "";

    return `${star}${link}`;
  }

  if (col === "nose_notes")
    return escapeHtml(fmt(cleanNotes(row.nose_notes)));

  if (col === "palate_notes")
    return escapeHtml(fmt(cleanNotes(row.palate_notes)));

  if (col === "finish_notes")
    return escapeHtml(fmt(cleanNotes(row.finish_notes)));

  return escapeHtml(row[col]);
}

function renderTable(rows) {
  if (!elContent) return;

  if (!rows || rows.length === 0) {
    elContent.innerHTML =
      `<div style="padding:12px;">No sensory rows returned.</div>`;

    window.dispatchEvent(
      new Event("skin2:inventoryRendered")
    );

    return;
  }

  const displayCols = [
    "bottle_expression",
    "nose_notes",
    "palate_notes",
    "finish_notes",
  ];

  const thead = displayCols
    .map((c) => {
      const cls = sensoryColClass(c);

      return `
        <th class="${escapeHtml(cls)}"
            title="${escapeHtml(c)}">
          ${escapeHtml(headerLabel(c))}
        </th>
      `;
    })
    .join("");

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
        .map((c) =>
          r[c] == null ? "" : String(r[c])
        )
        .join(" | ")
        .toLowerCase();

      const tds = displayCols
        .map((c) => {
          const cls = sensoryColClass(c);

          return `
            <td class="${escapeHtml(cls)}">
              ${renderCell(c, r)}
            </td>
          `;
        })
        .join("");

      return `
        <tr class="inv-row"
            data-search="${escapeHtml(searchable)}">
          ${tds}
        </tr>
      `;
    })
    .join("");

  elContent.innerHTML = `
    <table class="skin2-table"
           aria-label="Sensory notes table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>

    <style>
      td.col-notes{
        white-space:normal;
        line-height:1.35;
        max-width:520px;
      }

      td.col-expression{
        white-space:nowrap;
      }
    </style>
  `;

  window.dispatchEvent(
    new Event("skin2:inventoryRendered")
  );
}

async function loadSensory() {
  clearError();

  setStatus(
    sensoryOnlyNew
      ? "Loading sensory notes (recent only)…"
      : "Loading sensory notes…"
  );

  try {
    let q = supabase.from(VIEW_NAME).select("*");

    if (sensoryOnlyNew) {
      q = q.eq("new_update", true);
    }

    const { data, error } =
      await q.limit(ROW_LIMIT);

    if (error) throw error;

    renderTable(data || []);
    setStatus(`Loaded ${data?.length ?? 0} rows`);

  } catch (e) {
    setStatus("Error loading sensory notes");

    showError(
      "Failed to load v_sensory from Supabase.",
      e
    );

    if (elContent) elContent.innerHTML = "";
  }
}

function wireSensoryToggle() {
  window.addEventListener(
    "hbh:sensoryFilterChanged",
    (e) => {
      const onlyNew = !!(
        e &&
        e.detail &&
        e.detail.onlyNew
      );

      if (onlyNew === sensoryOnlyNew) return;

      sensoryOnlyNew = onlyNew;
      loadSensory();
    }
  );
}

// Boot
wireSensoryToggle();

sensoryOnlyNew = !!(
  window.HBH_SensoryFilter &&
  window.HBH_SensoryFilter.onlyNew
);

loadSensory();
