/* =========================================================
   Honey Barrel Hunter — Skin2 Barrel Picker Page
   File: assets/js/barrel-picker-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";

const VIEW_PROFILE   = "v_barrel_picker_detail";
const VIEW_INVENTORY = "v_bottle_inventory";
const BOTTLES_LIMIT  = 500;

// DOM
const elTitle      = document.getElementById("bp-title");
const elSubtitle   = document.getElementById("bp-subtitle");
const elPhoto      = document.getElementById("bp-photo");
const elCard       = document.getElementById("bp-card");
const elTable      = document.getElementById("bp-table");
const elTableTitle = document.getElementById("bp-table-title");
const elDebug      = document.getElementById("bp-debug");

// ---------------- Utilities ----------------
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isNumberLike(v) {
  const n = Number(v);
  return Number.isFinite(n);
}

const fmt1 = (v) => (isNumberLike(v) ? Number(v).toFixed(1) : "—");
const fmtUsd = (v) => (isNumberLike(v) ? `$${Number(v).toFixed(2)}` : "—");

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  return n < 1 ? "NAS" : n.toFixed(1);
}

function getId() {
  return (new URL(location.href).searchParams.get("barrel_picker_id") || "").trim();
}

function imgUrl(f) {
  return f ? `../assets/img/barrel_pickers/${encodeURIComponent(f)}` : "";
}

// ---------------- Links ----------------
function barrelLink(id, label) {
  if (!id) return escapeHtml(label);
  return `<a class="skin2-link" href="../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}">${escapeHtml(label)}</a>`;
}

function distilleryLink(id, label) {
  if (!id) return escapeHtml(label);
  return `<a class="skin2-link" href="../distilleries/index.html?distillery_id=${encodeURIComponent(id)}">${escapeHtml(label)}</a>`;
}

// ---------------- Star (GLOBAL SVG) ----------------
function rotatingStarSVG({ size = 18, style = "" } = {}) {
  return `
    <svg
      class="star-icon"
      viewBox="0 0 24 24"
      width="${size}"
      height="${size}"
      aria-hidden="true"
      style="${style}"
    >
      <path
        d="M12 2.2l2.9 6.2 6.8.6-5.2 4.5 1.6 6.7L12 16.9 5.9 20.2l1.6-6.7L2.3 9l6.8-.6L12 2.2z"
        fill="rgba(215,162,74,0.95)"
        stroke="rgba(181,122,42,0.85)"
        stroke-width="0.9"
      />
    </svg>
  `;
}

// ---------------- Hero ----------------
function cityState(r) {
  const city = (r.city || "").trim();
  const state = (r.state || "").trim();
  return `${city}${city && state ? ", " : ""}${state}` || "—";
}

function renderHero(rows) {
  const r = rows[0] || {};

  if (elTitle) elTitle.textContent = r.barrel_picker_name || "Barrel Picker";
  if (elSubtitle) elSubtitle.textContent = cityState(r);

  if (elPhoto) {
    elPhoto.innerHTML = r.barrel_picker_photo_filename
      ? `<img src="${imgUrl(r.barrel_picker_photo_filename)}" alt="Barrel picker photo" />`
      : `<div class="muted-card">No image</div>`;
  }

  if (!elCard) return;

  elCard.innerHTML = `
    ${r.barrel_picker_type ? `<p><b>${escapeHtml(r.barrel_picker_type)}</b></p>` : ""}
    ${r.full_address ? `<p>${escapeHtml(r.full_address)}</p>` : ""}
    ${r.phone_number ? `<p>${escapeHtml(r.phone_number)}</p>` : ""}
    <p>
      ${r.google_maps_url ? `<a href="${escapeHtml(r.google_maps_url)}" target="_blank">Google Maps</a>` : ""}
      ${r.website_url ? ` · <a href="${escapeHtml(r.website_url)}" target="_blank">Website</a>` : ""}
    </p>
    ${r.barrel_picker_description ? `<p>${escapeHtml(r.barrel_picker_description)}</p>` : ""}
  `;
}

// ---------------- Table helpers ----------------
function headerLabel(col) {
  return {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    distillery_name: "Distillery Name",
    bottle_expression: "Bottle Expression",
  }[col] || col;
}

function invColClass(col) {
  return {
    score: "col-score",
    msrp: "col-msrp",
    proof: "col-proof",
    age: "col-age",
    distillery_name: "col-distillery",
    bottle_expression: "col-expression",
  }[col] || "";
}

function renderCell(col, row) {
  if (col === "bottle_expression") {
    const star = row.new_update
      ? rotatingStarSVG({ size: 18, style: "margin-right:6px;" })
      : "";
    return `${star}${barrelLink(row.single_barrel_id, row.bottle_expression)}`;
  }

  if (col === "distillery_name")
    return distilleryLink(row.distillery_id, row.distillery_name);

  if (col === "msrp") return fmtUsd(row.msrp);
  if (col === "score") return fmt1(row.score ?? row.avg_score ?? row.composite_score);
  if (col === "proof") return fmt1(row.proof);
  if (col === "age") return fmtAge(row.age);

  return escapeHtml(row[col]);
}

// ---------------- Table render ----------------
function renderTable(rows) {
  if (!elTable) return;

  if (elTableTitle) {
    const hasNew = rows.some(r => r.new_update === true);
    elTableTitle.innerHTML = `Barrel Picks (${rows.length})${hasNew ? " " + rotatingStarSVG({ size: 16 }) : ""}`;
  }

  if (!rows.length) {
    elTable.innerHTML = `<div class="muted-card">No barrel picks found.</div>`;
    return;
  }

  const displayCols = ["score", "msrp", "proof", "age", "bottle_expression", "distillery_name"];

  const thead = displayCols
    .map(c => `<th class="${invColClass(c)}">${headerLabel(c)}</th>`)
    .join("");

  const tbody = rows
    .map(r => {
      const tds = displayCols
        .map(c => `<td class="${invColClass(c)}">${renderCell(c, r)}</td>`)
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  elTable.innerHTML = `
    <table class="skin2-table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

// ---------------- Load ----------------
async function load() {
  const id = getId();
  if (!id) return;

  const { data: hero } = await supabase.from(VIEW_PROFILE).select("*").eq("barrel_picker_id", id).limit(1);
  if (hero?.length) renderHero(hero);

  const { data: inv } = await supabase
    .from(VIEW_INVENTORY)
    .select("*")
    .eq("barrel_picker_id", id)
    .limit(BOTTLES_LIMIT);

  renderTable(inv || []);
}

load();
