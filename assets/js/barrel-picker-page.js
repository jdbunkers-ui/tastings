/* =========================================================
   Honey Barrel Hunter — Skin2 Barrel Picker Page
   File: assets/js/barrel-picker-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";

const VIEW_PROFILE = "v_barrel_picker_detail"; // hero/profile
const VIEW_INVENTORY = "v_bottle_inventory";   // bottom table (match distillery behavior)
const BOTTLES_LIMIT = 500;

/**
 * Use the SAME star asset as Inventory/Distillery pages
 */
const STAR_SRC = "../assets/img/logo/gold_spinning_star.gif";

// DOM (hero + existing layout)
const elTitle = document.getElementById("bp-title");
const elSubtitle = document.getElementById("bp-subtitle"); // may be null
const elPhoto = document.getElementById("bp-photo");
const elCard = document.getElementById("bp-card");

// Bottom-half mount(s) (we will render Skin2 table into bp-table)
const elTable = document.getElementById("bp-table");
const elTableTitle = document.getElementById("bp-table-title");
const elDebug = document.getElementById("bp-debug");

// ---------------- Helpers ----------------
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

function fmt1(v) {
  if (!isNumberLike(v)) return "—";
  return Number(v).toFixed(1);
}

function fmtUsd(v) {
  if (!isNumberLike(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  if (n < 1.0) return "NAS";
  return n.toFixed(1);
}

function getId() {
  return (new URL(window.location.href).searchParams.get("barrel_picker_id") || "").trim();
}

function imgUrl(f) {
  return f ? `../assets/img/barrel_pickers/${encodeURIComponent(f)}` : "";
}

/**
 * Bottle Expression hyperlink (same-tab)
 * barrel_pickers/index.html -> ../bottles/index.html
 */
function barrelLink(singleBarrelId, label) {
  const id = (singleBarrelId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

/**
 * Distillery Name hyperlink
 * barrel_pickers/index.html -> ../distilleries/index.html
 */
function distilleryLink(distilleryId, label) {
  const id = (distilleryId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../distilleries/index.html?distillery_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

function cityState(r) {
  const city = (r.city || "").trim();
  const state = (r.state || "").trim();
  const line = `${city}${city && state ? ", " : ""}${state}`.trim();
  return line || "—";
}

/**
 * new_update returned by view as boolean
 */
function anyNewUpdate(rows) {
  return rows.some((r) => r?.new_update === true);
}

/**
 * tasting_count is an aggregate in the view; sum across rows
 */
function sumTastingCount(rows) {
  return rows.reduce((acc, r) => acc + (Number(r?.tasting_count) || 0), 0);
}

function starImgHtml() {
  return `<img class="new-tasting-star" src="${STAR_SRC}" alt="New" />`;
}

// ---------------- Render (Hero unchanged) ----------------
function renderHero(rows) {
  const r = rows[0] || {};

  if (elTitle) elTitle.textContent = r.barrel_picker_name || "Barrel Picker";
  if (elSubtitle) elSubtitle.textContent = cityState(r);

  if (elPhoto) {
    elPhoto.innerHTML = r.barrel_picker_photo_filename
      ? `<img src="${imgUrl(r.barrel_picker_photo_filename)}" alt="Barrel picker photo" />`
      : `<div class="muted-card">No image</div>`;
  }

  if (elCard) {
    const locationLine = cityState(r);

    elCard.innerHTML = `
      ${
        r.barrel_picker_type
          ? `<p style="margin:0 0 8px;"><b>${escapeHtml(r.barrel_picker_type)}</b></p>`
          : ``
      }

      ${
        locationLine && locationLine !== "—"
          ? `<p class="mono" style="margin:0 0 10px; opacity:0.8;">${escapeHtml(locationLine)}</p>`
          : ``
      }

      ${
        r.full_address
          ? `<p style="margin:0 0 8px;">${escapeHtml(r.full_address)}</p>`
          : ``
      }

      ${
        r.phone_number
          ? `<p style="margin:0 0 10px;">${escapeHtml(r.phone_number)}</p>`
          : ``
      }

      <p style="margin:0 0 10px;">
        ${
          r.google_maps_url
            ? `<a href="${escapeHtml(r.google_maps_url)}" target="_blank" rel="noopener">Google Maps</a>`
            : ""
        }
        ${
          r.website_url
            ? `${r.google_maps_url ? " · " : ""}<a href="${escapeHtml(r.website_url)}" target="_blank" rel="noopener">Website</a>`
            : ""
        }
      </p>

      ${
        r.barrel_picker_description
          ? `<p style="margin:0;">${escapeHtml(r.barrel_picker_description)}</p>`
          : ``
      }
    `;
  }
}

/**
 * ---------------- Bottom-half (Skin2 inventory-style table)
 * Columns:
 * Score | MSRP | Proof | Age | Distillery Name | Bottle Expression
 * ----------------
 */
function headerLabel(col) {
  const map = {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    distillery_name: "Distillery Name",
    bottle_expression: "Bottle Expression",
  };
  return map[col] || col;
}

function invColClass(col) {
  const map = {
    score: "col-score",
    msrp: "col-msrp",
    proof: "col-proof",
    age: "col-age",
    distillery_name: "col-distillery",
    bottle_expression: "col-expression",
  };
  return map[col] || "";
}

function renderCell(col, row) {
  if (col === "bottle_expression") {
    const star = row.new_update
      ? `<img
           src="../assets/img/logo/gold_spinning_star.gif"
           alt="New"
           style="height:18px; vertical-align:middle; margin-right:6px;"
         />`
      : "";

    return `${star}${barrelLink(row.single_barrel_id, row.bottle_expression)}`;
  }

  if (col === "distillery_name") {
    return distilleryLink(row.distillery_id, row.distillery_name);
  }

  if (col === "msrp") return fmtUsd(row.msrp);
  if (col === "score") return fmt1(row.score ?? row.avg_score ?? row.composite_score);
  if (col === "proof") return fmt1(row.proof ?? row.bottling_strength ?? row.bottling_strength_type);
  if (col === "age") return fmtAge(row.age ?? row.age_years ?? row.age_in_years ?? row.age_statement);

  return escapeHtml(row[col]);
}

function renderTable(rows) {
  if (elTableTitle) {
    const tastingsTotal = sumTastingCount(rows);
    const star = anyNewUpdate(rows) ? ` ${starImgHtml()}` : "";
    elTableTitle.innerHTML = `Barrel Picks (${rows.length}) · Tastings (${tastingsTotal})${star}`;
  }

  if (!elTable) return;

  if (!rows.length) {
    elTable.innerHTML = `<div class="muted-card">No barrel picks found for this barrel picker.</div>`;
    return;
  }

  // Sort: highest score first (same feel as distillery-page)
  const sorted = [...rows].sort((a, b) => {
    const aa = Number(a.score ?? a.avg_score ?? a.composite_score);
    const bb = Number(b.score ?? b.avg_score ?? b.composite_score);
    if (!Number.isFinite(bb) && !Number.isFinite(aa)) return 0;
    if (!Number.isFinite(bb)) return -1;
    if (!Number.isFinite(aa)) return 1;
    return bb - aa;
  });

  const displayCols = ["score", "msrp", "proof", "age", "distillery_name", "bottle_expression"];

  const thead = displayCols
    .map((c) => {
      const cls = invColClass(c);
      return `<th class="${escapeHtml(cls)}" title="${escapeHtml(c)}">${escapeHtml(
        headerLabel(c)
      )}</th>`;
    })
    .join("");

  const searchableFields = [
    "bottle_expression",
    "distillery_name",
    "blender_name",
    "single_barrel_id",
    "distillery_id",
    "blender_id",
  ];

  const tbody = sorted
    .map((r) => {
      const searchable = searchableFields
        .filter((c) => c in r)
        .map((c) => (r[c] == null ? "" : String(r[c])))
        .join(" | ")
        .toLowerCase();

      const tds = displayCols
        .map((c) => {
          const cls = invColClass(c);
          return `<td class="${escapeHtml(cls)}">${renderCell(c, r)}</td>`;
        })
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elTable.innerHTML = `
    <div class="skin2-table-wrap" style="overflow-x: visible;">
      <table class="skin2-table" aria-label="Barrel picker inventory table">
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}

function renderError(msg) {
  if (elSubtitle) elSubtitle.textContent = msg;
  if (elCard) {
    elCard.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(msg)}</div>`;
  }
  if (elTable) elTable.innerHTML = "";
}

// ---------------- Load ----------------
async function load() {
  const id = getId();
  if (!id) {
    renderError("Missing barrel_picker_id in URL. Expected ?barrel_picker_id=<uuid>.");
    if (elDebug) elDebug.textContent = JSON.stringify({ error: "Missing barrel_picker_id" }, null, 2);
    return;
  }

  // 1) Profile (hero)
  const { data: profileRows, error: profileErr } = await supabase
    .from(VIEW_PROFILE)
    .select("*")
    .eq("barrel_picker_id", id)
    .limit(1);

  if (profileErr) {
    renderError(profileErr.message || String(profileErr));
    if (elDebug) elDebug.textContent = JSON.stringify({ error: profileErr }, null, 2);
    return;
  }

  const heroRows = profileRows || [];
  if (!heroRows.length) {
    renderError(`No rows returned for barrel_picker_id=${id}`);
    if (elDebug) elDebug.textContent = JSON.stringify({ barrel_picker_id: id, hero_rows: 0 }, null, 2);
    return;
  }

  renderHero(heroRows);

  // 2) Inventory rows (bottom table) — FROM v_bottle_inventory
  const { data: invRowsRaw, error: invErr } = await supabase
    .from(VIEW_INVENTORY)
    .select("*")
    .eq("barrel_picker_id", id)
    .limit(BOTTLES_LIMIT);

  if (invErr) {
    if (elTable) {
      elTable.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(invErr.message || String(invErr))}</div>`;
    }
    if (elDebug) elDebug.textContent = JSON.stringify({ barrel_picker_id: id, inventory_error: invErr }, null, 2);
    return;
  }

  const invRows = invRowsRaw || [];

  // Sort: highest score first (same feel as distillery-page)
  const sorted = [...invRows].sort((a, b) => {
    const aa = Number(a.score ?? a.avg_score ?? a.composite_score);
    const bb = Number(b.score ?? b.avg_score ?? b.composite_score);
    if (!Number.isFinite(bb) && !Number.isFinite(aa)) return 0;
    if (!Number.isFinite(bb)) return -1;
    if (!Number.isFinite(aa)) return 1;
    return bb - aa;
  });

  renderTable(sorted);

  if (elDebug) elDebug.textContent = JSON.stringify(
    { hero: heroRows[0], inventory_rows: sorted.length },
    null,
    2
  );
}

load();
