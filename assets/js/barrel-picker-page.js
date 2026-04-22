/* =========================================================
   Honey Barrel Hunter — Skin2 Barrel Picker Page
   File: assets/js/barrel-picker-page.js
   GA4 single_barrel_id + bottle name tracking added
   GA4 distillery_id + distillery_name tracking added
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

const VIEW_PROFILE   = "v_barrel_picker_detail";
const VIEW_INVENTORY = "v_bottle_inventory";
const BOTTLES_LIMIT  = 500;

/* ---------------- DOM ---------------- */
const elTitle    = document.getElementById("bp-title");
const elPhoto    = document.getElementById("bp-photo");
const elCard     = document.getElementById("bp-card");
const elTable    = document.getElementById("bp-table");
const elFilter   = document.getElementById("filter");
const elToggle   = document.getElementById("barrelPickerNewOnlyToggle");

const elHint     = document.getElementById("bp-table-hint");
const elStarSlot = document.getElementById("bp-star-slot");

/* ---------------- State ---------------- */
let ALL_ROWS = [];
let ONLY_NEW = false;
let QUERY    = "";

const KEY_ONLY_NEW = "hbh_barrel_picker_new_only";

/* ---------------- Utilities ---------------- */
function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isNumberLike(v) {
  return Number.isFinite(Number(v));
}

const fmt1   = (v) => (isNumberLike(v) ? Number(v).toFixed(1) : "—");
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

/* ---------------- Links ---------------- */

/* GA tracked bottle hyperlink */
function barrelLink(id, label) {
  const sbid = (id ?? "").toString().trim();
  const text = (label ?? "").toString().trim();

  if (!sbid) return escapeHtml(text);

  return `
    <a
      class="skin2-link"
      href="../bottles/index.html?single_barrel_id=${encodeURIComponent(sbid)}"
      data-analytics="single-barrel-click"
      data-single-barrel-id="${escapeHtml(sbid)}"
      data-bottle-name="${escapeHtml(text || sbid)}"
    >
      ${escapeHtml(text || sbid)}
    </a>
  `;
}

/* GA tracked distillery hyperlink */
function distilleryLink(id, label) {
  const distId = (id ?? "").toString().trim();
  const text = (label ?? "").toString().trim();

  if (!distId) return escapeHtml(text);

  return `
    <a
      class="skin2-link"
      href="../distilleries/index.html?distillery_id=${encodeURIComponent(distId)}"
      data-analytics="distillery-click"
      data-distillery-id="${escapeHtml(distId)}"
      data-distillery-name="${escapeHtml(text || distId)}"
    >
      ${escapeHtml(text || distId)}
    </a>
  `;
}

/* ---------------- Status helpers ---------------- */
function setHint(text) {
  if (elHint) elHint.textContent = text ?? "";
}

function setTogglePressed(pressed) {
  if (!elToggle) return;

  elToggle.setAttribute("aria-pressed", pressed ? "true" : "false");

  elToggle.title = pressed
    ? "Showing only bottles with recently updated tastings (click to show all)"
    : "Filter bottles to only those with recently updated tastings";
}

/* ---------------- Hero ---------------- */
function renderHero(rows) {
  const r = rows[0] || {};

  if (elTitle) {
    elTitle.textContent = r.barrel_picker_name || "Barrel Picker";
  }

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
      ${
        r.google_maps_url
          ? `<a href="${escapeHtml(r.google_maps_url)}" target="_blank" rel="noreferrer">Google Maps</a>`
          : ""
      }

      ${
        r.website_url
          ? ` · <a href="${escapeHtml(r.website_url)}" target="_blank" rel="noreferrer">Website</a>`
          : ""
      }
    </p>

    ${
      r.barrel_picker_description
        ? `<p>${escapeHtml(r.barrel_picker_description)}</p>`
        : ""
    }
  `;
}

/* ---------------- Table helpers ---------------- */
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
      ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
      : "";

    return `${star}${barrelLink(row.single_barrel_id, row.bottle_expression)}`;
  }

  if (col === "distillery_name") {
    return distilleryLink(row.distillery_id, row.distillery_name);
  }

  if (col === "msrp") return fmtUsd(row.msrp);
  if (col === "score") return fmt1(row.score ?? row.avg_score ?? row.composite_score);
  if (col === "proof") return fmt1(row.proof);
  if (col === "age") return fmtAge(row.age);

  return escapeHtml(row[col]);
}

/* ---------------- Filtering ---------------- */
function applyFilters() {
  let rows = [...ALL_ROWS];

  if (ONLY_NEW) {
    rows = rows.filter((r) => r.new_update === true);
  }

  if (QUERY) {
    rows = rows.filter((r) =>
      [
        r.bottle_expression,
        r.distillery_name,
        r.single_barrel_id,
        r.distillery_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(QUERY)
    );
  }

  renderTable(rows);
}

/* ---------------- Table render ---------------- */
function renderTable(rows) {
  setHint(`Loaded ${rows.length} rows`);

  if (!elTable) return;

  if (!rows.length) {
    elTable.innerHTML = `<div class="muted-card">No barrel picks found.</div>`;
    return;
  }

  const cols = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "distillery_name"
  ];

  const thead = cols
    .map((c) => `<th class="${invColClass(c)}">${headerLabel(c)}</th>`)
    .join("");

  const tbody = rows
    .map((r) => {
      const tds = cols
        .map((c) => `<td class="${invColClass(c)}">${renderCell(c, r)}</td>`)
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

/* ---------------- Toggle wiring ---------------- */
(function initToggle() {
  if (elStarSlot) {
    elStarSlot.innerHTML = rotatingStarSVG({ size: 16 });
  } else if (elToggle && !elToggle.querySelector("svg")) {
    elToggle.insertAdjacentHTML(
      "afterbegin",
      rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
    );
  }

  if (!elToggle) return;

  const initial = localStorage.getItem(KEY_ONLY_NEW) === "1";

  ONLY_NEW = initial;
  setTogglePressed(initial);

  elToggle.addEventListener("click", () => {
    ONLY_NEW = !ONLY_NEW;
    setTogglePressed(ONLY_NEW);

    localStorage.setItem(KEY_ONLY_NEW, ONLY_NEW ? "1" : "0");

    applyFilters();
  });
})();

/* ---------------- Search wiring ---------------- */
if (elFilter) {
  elFilter.addEventListener("input", (e) => {
    QUERY = String(e.target.value || "").toLowerCase().trim();
    applyFilters();
  });
}

/* ---------------- Load ---------------- */
async function load() {
  const id = getId();

  if (!id) {
    setHint("Missing barrel_picker_id");
    return;
  }

  setHint("Loading…");

  try {
    const { data: hero, error: heroErr } = await supabase
      .from(VIEW_PROFILE)
      .select("*")
      .eq("barrel_picker_id", id)
      .limit(1);

    if (heroErr) {
      console.warn("Hero load error:", heroErr);
    } else if (hero?.length) {
      renderHero(hero);
    }

    const { data, error: invErr } = await supabase
      .from(VIEW_INVENTORY)
      .select("*")
      .eq("barrel_picker_id", id)
      .limit(BOTTLES_LIMIT);

    if (invErr) {
      console.warn("Inventory load error:", invErr);
      setHint("Error loading rows");
      ALL_ROWS = [];
      applyFilters();
      return;
    }

    ALL_ROWS = data || [];
    applyFilters();

  } catch (err) {
    console.error("Barrel picker page load failed:", err);
    setHint("Error loading rows");
    ALL_ROWS = [];
    applyFilters();
  }
}

load();
