/* =========================================================
   Honey Barrel Hunter — Skin2 Distillery Page
   File: assets/js/distillery-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

/* ---------- Views / Limits ---------- */
const VIEW_PROFILE = "v_distillery";
const VIEW_INVENTORY = "v_bottle_inventory";
const BOTTLES_LIMIT = 500;

/* ---------- DOM ---------- */
const elError = document.getElementById("error");
const elLoading = document.getElementById("loading");
const elContent = document.getElementById("content");

const elName = document.getElementById("distillery-name");
const elState = document.getElementById("distillery-state");
const elAddress = document.getElementById("distillery-address");
const elDesc = document.getElementById("distillery-description");
const elMapsLink = document.getElementById("maps-link");

const elPhoto = document.getElementById("distillery-photo");
const elPhotoMissing = document.getElementById("photo-missing");

const elInvContent = document.getElementById("inventory-content");
const elInvStatus = document.getElementById("inventory-status");

const elFilter = document.getElementById("filter");
const elToggleBtn = document.getElementById("distilleryNewOnlyToggle");

/* ---------- State ---------- */
let ALL_ROWS = [];
let ONLY_NEW = false;
let QUERY = "";

/* ---------- Constants ---------- */
const KEY_ONLY_NEW = "hbh_distillery_new_only";

/* ---------- Helpers ---------- */
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function show(el, on) {
  if (!el) return;
  el.style.display = on ? "" : "none";
}

function setStatus(text) {
  if (!elInvStatus) return;
  elInvStatus.textContent = text ?? "";
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
  const text = label ?? "";
  if (!id) return escapeHtml(text);
  return `<a class="skin2-link" href="../bottles/index.html?single_barrel_id=${encodeURIComponent(
    id
  )}">${escapeHtml(text)}</a>`;
}

function barrelPickerLink(id, label) {
  const text = label ?? "";
  if (!id) return escapeHtml(text);
  return `<a class="skin2-link" href="../barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(
    id
  )}">${escapeHtml(text)}</a>`;
}

/* ---------- Table config ---------- */
function headerLabel(col) {
  return (
    {
      score: "Score",
      msrp: "MSRP",
      proof: "Proof",
      age: "Age",
      barrel_picker_name: "Barrel Picker",
      bottle_expression: "Bottle Expression",
    }[col] || col
  );
}

function colClass(col) {
  return (
    {
      score: "col-score",
      msrp: "col-msrp",
      proof: "col-proof",
      age: "col-age",
      bottle_expression: "col-expression",
      barrel_picker_name: "col-barrel-picker",
    }[col] || ""
  );
}

/* ---------- Render Cell ---------- */
function renderCell(col, row) {
  if (col === "bottle_expression") {
    const star = row?.new_update
      ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
      : "";
    return `${star}${barrelLink(row.single_barrel_id, row.bottle_expression)}`;
  }

  if (col === "barrel_picker_name") {
    return barrelPickerLink(row.barrel_picker_id, row.barrel_picker_name);
  }

  if (col === "msrp") return fmtMoney(row.msrp);
  if (col === "score") return fmt1(row.score ?? row.avg_score ?? row.composite_score);
  if (col === "proof") return fmt1(row.proof);
  if (col === "age") return fmtAge(row.age);

  return escapeHtml(row[col]);
}

/* ---------- Render Table ---------- */
function renderTable(rows) {
  if (!elInvContent) return;

  if (!rows.length) {
    elInvContent.innerHTML = `<div class="muted-card">No bottles found.</div>`;
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
    return;
  }

  const cols = ["score", "msrp", "proof", "age", "bottle_expression", "barrel_picker_name"];

  const thead = cols
    .map((c) => `<th class="${escapeHtml(colClass(c))}">${escapeHtml(headerLabel(c))}</th>`)
    .join("");

  const searchableFields = [
    "bottle_expression",
    "barrel_picker_name",
    "distillery_name",
    "single_barrel_id",
    "barrel_picker_id",
    "distillery_id",
  ];

  const tbody = rows
    .map((r) => {
      const searchable = searchableFields
        .filter((k) => k in r)
        .map((k) => (r[k] == null ? "" : String(r[k])))
        .join(" | ")
        .toLowerCase();

      const tds = cols
        .map((c) => `<td class="${escapeHtml(colClass(c))}">${renderCell(c, r)}</td>`)
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elInvContent.innerHTML = `
    <table class="skin2-table" aria-label="Distillery bottles table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;

  window.dispatchEvent(new Event("skin2:inventoryRendered"));
}

/* ---------- Apply Filters ---------- */
function applyFilters() {
  let rows = [...ALL_ROWS];

  if (ONLY_NEW) rows = rows.filter((r) => r?.new_update === true);

  if (QUERY) {
    const q = QUERY;
    rows = rows.filter((r) => {
      const hay = [
        r.bottle_expression,
        r.barrel_picker_name,
        r.distillery_name,
        r.single_barrel_id,
        r.barrel_picker_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }

  renderTable(rows);

  const total = ALL_ROWS.length;
  const shown = rows.length;

  if (!QUERY && !ONLY_NEW) setStatus(`Loaded ${total} rows`);
  else if (!QUERY && ONLY_NEW) setStatus(`Showing ${shown} of ${total} (new updates only)`);
  else if (QUERY && !ONLY_NEW) setStatus(`Showing ${shown} of ${total} (filter: "${QUERY}")`);
  else setStatus(`Showing ${shown} of ${total} (new only + filter: "${QUERY}")`);
}

/* ---------- Toggle Wiring ---------- */
function setPressed(pressed) {
  if (!elToggleBtn) return;
  elToggleBtn.setAttribute("aria-pressed", pressed ? "true" : "false");
  elToggleBtn.title = pressed
    ? "Showing only recently updated tastings (click to show all)"
    : "Filter to only recently updated tastings";
}

(function initToggle() {
  if (!elToggleBtn) return;

  const initial = localStorage.getItem(KEY_ONLY_NEW) === "1";
  ONLY_NEW = initial;
  setPressed(initial);

  elToggleBtn.addEventListener("click", () => {
    ONLY_NEW = !ONLY_NEW;
    setPressed(ONLY_NEW);
    localStorage.setItem(KEY_ONLY_NEW, ONLY_NEW ? "1" : "0");
    applyFilters();
  });
})();

/* ---------- Search Wiring ---------- */
function debounce(fn, waitMs = 60) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

const onSearchInput = debounce(() => {
  QUERY = (elFilter?.value ?? "").toLowerCase().trim();
  applyFilters();
});

if (elFilter) {
  elFilter.addEventListener("input", onSearchInput);
}

/* ---------- Load ---------- */
async function load() {
  const distilleryId = (qs("distillery_id") || "").trim();

  if (!distilleryId) {
    show(elLoading, false);
    show(elContent, false);
    show(elError, true);
    if (elError) elError.textContent = "Missing distillery_id in URL.";
    return;
  }

  show(elError, false);
  show(elLoading, true);
  show(elContent, false);
  setStatus("Loading…");

  // 1) Distillery profile
  const { data: dist, error: dErr } = await supabase
    .from(VIEW_PROFILE)
    .select("*")
    .eq("distillery_id", distilleryId)
    .maybeSingle();

  if (dErr || !dist) {
    show(elLoading, false);
    show(elContent, false);
    show(elError, true);
    if (elError) elError.textContent = dErr?.message || "Distillery not found.";
    return;
  }

  if (elName) elName.textContent = dist.distillery_name || "—";
  if (elState) elState.textContent = dist.state || "—";
  if (elAddress) elAddress.textContent = dist.full_address || "—";
  if (elDesc) elDesc.textContent = dist.distillery_description || "—";

  if (elMapsLink) {
    const q = encodeURIComponent(`${dist.distillery_name} ${dist.full_address || ""}`.trim());
    elMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  if (elPhoto) {
    const filename = (dist.distillery_photo_filename || `${distilleryId}.jpg`).toString();
    elPhoto.src = `../assets/img/distilleries/${filename}`;
    elPhoto.onerror = () => {
      show(elPhoto, false);
      show(elPhotoMissing, true);
    };
  }

  // 2) Inventory rows
  const { data: rows, error: iErr } = await supabase
    .from(VIEW_INVENTORY)
    .select("*")
    .eq("distillery_id", distilleryId)
    .limit(BOTTLES_LIMIT);

  if (iErr) {
    ALL_ROWS = [];
    if (elInvContent) {
      elInvContent.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(
        iErr.message || String(iErr)
      )}</div>`;
    }
    setStatus("Error loading bottles");
  } else {
    ALL_ROWS = rows || [];
    applyFilters();
  }

  show(elLoading, false);
  show(elContent, true);
}

load();
