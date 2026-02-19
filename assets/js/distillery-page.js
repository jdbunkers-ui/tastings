/* =========================================================
   Honey Barrel Hunter — Skin2 Distillery Page
   File: assets/js/distillery-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

/* ---------- Views / Limits ---------- */
const VIEW_PROFILE   = "v_distillery";
const VIEW_INVENTORY = "v_bottle_inventory";
const BOTTLES_LIMIT  = 500;

/* ---------- DOM ---------- */
const elError       = document.getElementById("error");
const elLoading     = document.getElementById("loading");
const elContent     = document.getElementById("content");

const elName        = document.getElementById("distillery-name");
const elState       = document.getElementById("distillery-state");
const elAddress     = document.getElementById("distillery-address");
const elDesc        = document.getElementById("distillery-description");
const elMapsLink    = document.getElementById("maps-link");

const elPhoto       = document.getElementById("distillery-photo");
const elPhotoMissing= document.getElementById("photo-missing");

const elInvWrap     = document.getElementById("inventory-table-wrap");
const elInvContent  = document.getElementById("inventory-content");
const elInvStatus   = document.getElementById("inventory-status");

const elFilter      = document.getElementById("filter");
const elToggleBtn   = document.getElementById("distilleryNewOnlyToggle");
const elStarSlot    = document.getElementById("distillery-star-slot");

/* ---------- State ---------- */
let ALL_ROWS = [];
let ONLY_NEW = false;

/* ---------- Helpers ---------- */
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function show(el, on) {
  if (!el) return;
  el.style.display = on ? "" : "none";
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
  const n = Number(v);
  return Number.isFinite(n);
}

function fmt1(v) {
  return isNumberLike(v) ? Number(v).toFixed(1) : "—";
}

function fmtMoney(v) {
  return isNumberLike(v) ? `$${Number(v).toFixed(2)}` : "—";
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  return n < 1 ? "NAS" : n.toFixed(1);
}

/* ---------- Links ---------- */
function barrelLink(id, label) {
  if (!id) return escapeHtml(label);
  return `<a class="skin2-link" href="../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}">${escapeHtml(label)}</a>`;
}

function barrelPickerLink(id, label) {
  if (!id) return escapeHtml(label);
  return `<a class="skin2-link" href="../barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(id)}">${escapeHtml(label)}</a>`;
}

/* ---------- Table config ---------- */
function headerLabel(col) {
  return {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    barrel_picker_name: "Barrel Picker",
    bottle_expression: "Bottle Expression",
  }[col] || col;
}

function colClass(col) {
  return {
    score: "col-score",
    msrp: "col-msrp",
    proof: "col-proof",
    age: "col-age",
    bottle_expression: "col-bottle",
  }[col] || "";
}

/* ---------- Render Cell ---------- */
function renderCell(col, row) {
  if (col === "bottle_expression") {
    const star = row.new_update
      ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
      : "";

    return `${star}${barrelLink(row.single_barrel_id, row.bottle_expression)}`;
  }

  if (col === "barrel_picker_name") {
    return barrelPickerLink(row.barrel_picker_id, row.barrel_picker_name);
  }

  if (col === "msrp")  return fmtMoney(row.msrp);
  if (col === "score") return fmt1(row.score ?? row.avg_score ?? row.composite_score);
  if (col === "proof") return fmt1(row.proof);
  if (col === "age")   return fmtAge(row.age);

  return escapeHtml(row[col]);
}

/* ---------- Render Table ---------- */
function renderTable(rows) {
  if (!elInvContent) return;

  if (!rows.length) {
    elInvContent.innerHTML = `<div class="muted-card">No bottles found.</div>`;
    return;
  }

  const cols = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "barrel_picker_name",
  ];

  const thead = cols
    .map(c => `<th class="${colClass(c)}">${headerLabel(c)}</th>`)
    .join("");

  const tbody = rows
    .map(r => {
      const searchable = [
        r.bottle_expression,
        r.barrel_picker_name,
        r.single_barrel_id,
      ].join(" ").toLowerCase();

      const tds = cols
        .map(c => `<td class="${colClass(c)}">${renderCell(c, r)}</td>`)
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elInvContent.innerHTML = `
    <table class="skin2-table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

/* ---------- Apply Filters ---------- */
function applyFilters() {
  let rows = [...ALL_ROWS];

  if (ONLY_NEW) {
    rows = rows.filter(r => r.new_update === true);
  }

  renderTable(rows);
  elInvStatus.textContent = `${rows.length} bottles`;
}

/* ---------- Toggle Wiring ---------- */
(function initToggle() {
  if (!elToggleBtn || !elStarSlot) return;

  elStarSlot.innerHTML = rotatingStarSVG({ size: 16 });

  function setPressed(v) {
    elToggleBtn.setAttribute("aria-pressed", v ? "true" : "false");
  }

  elToggleBtn.addEventListener("click", () => {
    ONLY_NEW = !ONLY_NEW;
    setPressed(ONLY_NEW);
    applyFilters();
  });
})();

/* ---------- Load ---------- */
async function load() {
  const distilleryId = qs("distillery_id");
  if (!distilleryId) {
    show(elLoading, false);
    show(elError, true);
    elError.textContent = "Missing distillery_id in URL.";
    return;
  }

  show(elLoading, true);
  show(elContent, false);

  const { data: dist, error: dErr } = await supabase
    .from(VIEW_PROFILE)
    .select("*")
    .eq("distillery_id", distilleryId)
    .maybeSingle();

  if (dErr || !dist) {
    show(elLoading, false);
    show(elError, true);
    elError.textContent = dErr?.message || "Distillery not found.";
    return;
  }

  elName.textContent    = dist.distillery_name;
  elState.textContent   = dist.state || "—";
  elAddress.textContent = dist.full_address || "—";
  elDesc.textContent    = dist.distillery_description || "—";

  if (elMapsLink) {
    elMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${dist.distillery_name} ${dist.full_address || ""}`
    )}`;
  }

  if (elPhoto) {
    elPhoto.src = `../assets/img/distilleries/${dist.distillery_photo_filename || `${distilleryId}.jpg`}`;
    elPhoto.onerror = () => {
      show(elPhoto, false);
      show(elPhotoMissing, true);
    };
  }

  const { data: rows, error: iErr } = await supabase
    .from(VIEW_INVENTORY)
    .select("*")
    .eq("distillery_id", distilleryId)
    .limit(BOTTLES_LIMIT);

  if (iErr) {
    elInvContent.innerHTML = `<div class="muted-card error">${iErr.message}</div>`;
  } else {
    ALL_ROWS = rows || [];
    applyFilters();
  }

  show(elLoading, false);
  show(elContent, true);
}

load();
