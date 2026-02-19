/* =========================================================
   Honey Barrel Hunter — Skin2 Distillery Page
   File: assets/js/distillery-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

/**
 * Renders:
 *  - Distillery profile from public.v_distillery
 *  - Inventory table from public.v_bottle_inventory filtered by distillery_id
 *
 * Uses global rotating SVG star (no GIFs, no local animation overrides)
 */

// Views / limits
const VIEW_PROFILE   = "v_distillery";
const VIEW_INVENTORY = "v_bottle_inventory";
const BOTTLES_LIMIT  = 500;

// Photo strategy
const PHOTO_BASE = "../assets/img/distilleries/";
const DEFAULT_PHOTO_EXT = "jpg";

// ---------- DOM ----------
const elError   = document.getElementById("error");
const elLoading = document.getElementById("loading");
const elContent = document.getElementById("content");

// Distillery profile fields
const elName    = document.getElementById("distillery-name");
const elState   = document.getElementById("distillery-state");
const elAddress = document.getElementById("distillery-address");
const elDesc    = document.getElementById("distillery-description");
const elMapsLink = document.getElementById("maps-link");

const elPhoto = document.getElementById("distillery-photo");
const elPhotoMissing = document.getElementById("photo-missing");

// Bottom table
const elInvWrap    = document.getElementById("inventory-table-wrap");
const elInvContent = document.getElementById("inventory-content");
const elInvStatus  = document.getElementById("inventory-status");

// ---------- Helpers ----------
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function show(el, on) {
  if (!el) return;
  el.style.display = on ? "" : "none";
}

function setLoading(on) {
  show(elLoading, on);
  show(elContent, !on);
}

function setText(el, v) {
  if (el) el.textContent = v ?? "";
}

function setStatus(v) {
  if (elInvStatus) elInvStatus.textContent = v ?? "";
}

function clearError() {
  if (!elError) return;
  elError.textContent = "";
  show(elError, false);
}

function showError(msg, details) {
  if (!elError) return;
  const extra =
    details && typeof details === "object"
      ? `\n\n${JSON.stringify(details, null, 2)}`
      : details
      ? `\n\n${String(details)}`
      : "";
  elError.textContent = `${msg}${extra}`;
  show(elError, true);
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

function fmtMoney(v) {
  return isNumberLike(v) ? `$${Number(v).toFixed(2)}` : escapeHtml(v);
}

function fmt1(v) {
  return isNumberLike(v) ? Number(v).toFixed(1) : escapeHtml(v);
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  return n < 1 ? "NAS" : n.toFixed(1);
}

function buildFullAddress(d) {
  if (d.full_address) return d.full_address;
  return [
    d.address_line_1,
    d.address_line_2,
    d.city,
    d.state,
    d.postal_code,
    d.country,
  ].filter(Boolean).join(", ") || "N/A";
}

function buildPhotoUrl(id, file) {
  return `${PHOTO_BASE}${file || `${id}.${DEFAULT_PHOTO_EXT}`}`;
}

function buildMapsUrl(name, addr) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${name} ${addr}`
  )}`;
}

/* ---------- Link helpers ---------- */

function barrelLink(id, label) {
  if (!id) return escapeHtml(label);
  return `<a class="skin2-link" href="../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}">
    ${escapeHtml(label)}
  </a>`;
}

function barrelPickerLink(id, label) {
  if (!id) return escapeHtml(label);
  return `<a class="skin2-link" href="../barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(id)}">
    ${escapeHtml(label)}
  </a>`;
}

/* ---------- Inventory table ---------- */

function headerLabel(col) {
  return {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    barrel_picker_name: "Barrel Picker Name",
    bottle_expression: "Bottle Expression",
  }[col] || col;
}

function invColClass(col) {
  return {
    score: "col-score",
    msrp: "col-msrp",
    proof: "col-proof",
    age: "col-age",
    barrel_picker_name: "col-barrel-picker",
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

  if (col === "barrel_picker_name") {
    return barrelPickerLink(row.barrel_picker_id, row.barrel_picker_name);
  }

  if (col === "msrp")  return fmtMoney(row.msrp);
  if (col === "score") return fmt1(row.score ?? row.avg_score ?? row.composite_score);
  if (col === "proof") return fmt1(row.proof);
  if (col === "age")   return fmtAge(row.age);

  return escapeHtml(row[col]);
}

function renderInventoryTable(rows) {
  if (!elInvContent) return;

  if (!rows.length) {
    elInvContent.innerHTML = `<div class="muted-card">No inventory rows returned.</div>`;
    return;
  }

  const displayCols = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "barrel_picker_name",
  ];

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

  elInvContent.innerHTML = `
    <table class="skin2-table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

/* ---------- Boot ---------- */

(async function init() {
  const id = (qs("distillery_id") || "").trim();
  if (!id) {
    showError("Missing distillery_id in URL.");
    return;
  }

  try {
    clearError();
    setLoading(true);
    setStatus("Loading distillery…");

    const { data: dist } = await supabase
      .from(VIEW_PROFILE)
      .select("*")
      .eq("distillery_id", id)
      .maybeSingle();

    setText(elName, dist.distillery_name);
    setText(elState, dist.state);
    setText(elAddress, buildFullAddress(dist));
    setText(elDesc, dist.distillery_description);
    if (elMapsLink) elMapsLink.href = buildMapsUrl(dist.distillery_name, buildFullAddress(dist));

    if (elPhoto) {
      elPhoto.src = buildPhotoUrl(dist.distillery_id, dist.distillery_photo_filename);
      elPhoto.onerror = () => {
        show(elPhoto, false);
        show(elPhotoMissing, true);
      };
    }

    setStatus("Loading inventory…");

    const { data: rows } = await supabase
      .from(VIEW_INVENTORY)
      .select("*")
      .eq("distillery_id", id)
      .limit(BOTTLES_LIMIT);

    const sorted = [...(rows || [])].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0)
    );

    renderInventoryTable(sorted);
    setStatus(`Loaded ${sorted.length} rows`);
    setLoading(false);
  } catch (e) {
    setLoading(false);
    showError("Error loading distillery page.", e);
  }
})();
