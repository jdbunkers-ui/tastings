/* =========================================================
   Honey Barrel Hunter — Skin2 Distillery Page
   File: assets/js/distillery-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";

/**
 * Renders:
 *  - Distillery profile from public.v_distillery
 *  - Inventory table from public.v_bottle_inventory filtered by distillery_id
 *
 * Table behavior matches assets/js/inventory-page.js styling/feel, BUT:
 *  - ✅ Distillery column removed (redundant on this page)
 *  - ✅ Still uses same formatting + hyperlinks for Bottle Expression + Barrel Picker
 *  - ✅ Same new_update spinning star on Bottle Expression
 */

// Views / limits
const VIEW_PROFILE = "v_distillery";
const VIEW_INVENTORY = "v_bottle_inventory";
const BOTTLES_LIMIT = 500;

// Photo strategy
const PHOTO_BASE = "../assets/img/distilleries/";
const DEFAULT_PHOTO_EXT = "jpg";

// ---------- DOM ----------
const elError = document.getElementById("error");
const elLoading = document.getElementById("loading");
const elContent = document.getElementById("content");

// Distillery profile fields
const elName = document.getElementById("distillery-name");
const elState = document.getElementById("distillery-state");
const elAddress = document.getElementById("distillery-address");
const elDesc = document.getElementById("distillery-description");
const elMapsLink = document.getElementById("maps-link");

const elPhoto = document.getElementById("distillery-photo");
const elPhotoMissing = document.getElementById("photo-missing");

// Bottom-half table mount
const elInvWrap = document.getElementById("inventory-table-wrap");
const elInvContent = document.getElementById("inventory-content");
const elInvStatus = document.getElementById("inventory-status");

// ---------- Helpers ----------
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function show(el, isShown) {
  if (!el) return;
  el.style.display = isShown ? "" : "none";
}

function setLoading(isLoading) {
  show(elLoading, isLoading);
  show(elContent, !isLoading);
}

function setText(el, value) {
  if (!el) return;
  el.textContent = value ?? "";
}

function setStatus(text) {
  if (!elInvStatus) return;
  elInvStatus.textContent = text ?? "";
}

function clearError() {
  if (!elError) return;
  show(elError, false);
  elError.textContent = "";
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

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeStr(v, fallback = "N/A") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
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

function buildFullAddress(dist) {
  const full = (dist.full_address ?? "").toString().trim();
  if (full) return full;

  const parts = [
    dist.address_line_1,
    dist.address_line_2,
    dist.city,
    dist.state,
    dist.postal_code,
    dist.country,
  ]
    .map((v) => (v ?? "").toString().trim())
    .filter(Boolean);

  return parts.length ? parts.join(", ") : "N/A";
}

function buildPhotoUrl(distilleryId, photoFilename) {
  const file =
    (photoFilename ?? "").toString().trim() ||
    `${distilleryId}.${DEFAULT_PHOTO_EXT}`;
  return `${PHOTO_BASE}${file}`;
}

function buildMapsUrl(name, addressLine) {
  const q = encodeURIComponent(`${name} ${addressLine}`.trim());
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * =========================
 * Link helpers
 * =========================
 */

/**
 * Bottle Expression hyperlink (Same-tab)
 * distilleries/index.html -> ../bottles/index.html
 */
function barrelLink(singleBarrelId, label) {
  const id = (singleBarrelId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

/**
 * Barrel Picker Name hyperlink
 * distilleries/index.html -> ../barrel_pickers/index.html
 */
function barrelPickerLink(barrelPickerId, label) {
  const id = (barrelPickerId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

/**
 * =========================
 * Inventory table logic (inventory feel, distillery-specific columns)
 * Columns:
 * Score | MSRP | Proof | Age | Barrel Picker Name | Bottle Expression
 * =========================
 */

function headerLabel(col) {
  const map = {
    score: "Score",
    msrp: "MSRP",
    proof: "Proof",
    age: "Age",
    barrel_picker_name: "Barrel Picker Name",
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
    barrel_picker_name: "col-barrel-picker",
    bottle_expression: "col-expression",
  };
  return map[col] || "";
}

function selectColumns(keys) {
  // Distillery name removed on this page
  const desired = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "barrel_picker_name",


    // hidden/link-only + utility fields
    "barrel_picker_id",
    "single_barrel_id",

    // present for future use
    "blender_id",
    "blender_name",
  ];

  return desired.filter((k) => keys.includes(k));
}

function renderCell(col, row) {
  const v = row[col];

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

  if (col === "barrel_picker_name") {
    return barrelPickerLink(row.barrel_picker_id, row.barrel_picker_name);
  }

  if (col === "msrp") return fmtMoney(v);
  if (col === "score") return fmt1(v);
  if (col === "proof") return fmt1(v);
  if (col === "age") return fmtAge(v);

  return escapeHtml(v);
}

function renderInventoryTable(rows) {
  if (!elInvContent) return;

  if (!rows || rows.length === 0) {
    elInvContent.innerHTML = `<div style="padding:12px;">No inventory rows returned.</div>`;
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
    return;
  }

  const keys = Object.keys(rows[0] || {});
  const cols = selectColumns(keys);

  // Hide technical fields and future fields
  const displayCols = cols.filter(
    (c) =>
      c !== "single_barrel_id" &&
      c !== "barrel_picker_id" &&
      c !== "blender_id" &&
      c !== "blender_name"
  );

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
    "barrel_picker_name",
    "blender_name",
    "single_barrel_id",
    "barrel_picker_id",
    "blender_id",
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
          const cls = invColClass(c);
          return `<td class="${escapeHtml(cls)}">${renderCell(c, r)}</td>`;
        })
        .join("");

      return `<tr class="inv-row" data-search="${escapeHtml(searchable)}">${tds}</tr>`;
    })
    .join("");

  elInvContent.innerHTML = `
    <table class="skin2-table" aria-label="Bottle inventory table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;

  window.dispatchEvent(new Event("skin2:inventoryRendered"));
}

/**
 * =========================
 * Supabase fetches
 * =========================
 */

async function fetchDistilleryProfile(distilleryId) {
  const { data, error } = await supabase
    .from(VIEW_PROFILE)
    .select("*")
    .eq("distillery_id", distilleryId)
    .maybeSingle();

  if (error) throw new Error(`v_distillery fetch failed: ${error.message}`);
  if (!data) throw new Error("No distillery found for that distillery_id.");
  return data;
}

async function fetchInventoryForDistillery(distilleryId) {
  const { data, error } = await supabase
    .from(VIEW_INVENTORY)
    .select("*")
    .eq("distillery_id", distilleryId)
    .limit(BOTTLES_LIMIT);

  if (error) throw new Error(`v_bottle_inventory fetch failed: ${error.message}`);
  return data ?? [];
}

/**
 * =========================
 * Profile render
 * =========================
 */

function renderProfile(dist) {
  const name = safeStr(dist.distillery_name, "Unknown Distillery");
  const state = safeStr(dist.state, "N/A");
  const addressLine = buildFullAddress(dist);
  const desc = safeStr(dist.distillery_description, "No description available yet.");

  setText(elName, name);
  setText(elState, state);
  setText(elAddress, addressLine);
  setText(elDesc, desc);

  if (elMapsLink) elMapsLink.href = buildMapsUrl(name, addressLine);

  if (elPhoto) {
    elPhoto.src = buildPhotoUrl(dist.distillery_id, dist.distillery_photo_filename);
    elPhoto.onerror = () => {
      show(elPhoto, false);
      show(elPhotoMissing, true);
    };
  } else {
    show(elPhotoMissing, true);
  }
}

/**
 * =========================
 * Boot
 * =========================
 */

(async function init() {
  const distilleryId = (qs("distillery_id") || qs("id") || "").trim();

  if (!distilleryId) {
    setLoading(false);
    showError("Missing distillery_id in URL. Example: ?distillery_id=<uuid>");
    return;
  }

  clearError();
  setLoading(true);
  setStatus("Loading distillery…");

  try {
    // 1) Profile first
    const dist = await fetchDistilleryProfile(distilleryId);
    renderProfile(dist);

    // 2) Inventory table (bottom half)
    setStatus("Loading inventory…");
    show(elInvWrap, true);

    try {
      const rows = await fetchInventoryForDistillery(distilleryId);

      // Keep "highest score first" feel
      const sorted = [...rows].sort((a, b) => {
        const aa = Number(a.score ?? a.avg_score ?? a.composite_score);
        const bb = Number(b.score ?? b.avg_score ?? b.composite_score);
        if (!Number.isFinite(bb) && !Number.isFinite(aa)) return 0;
        if (!Number.isFinite(bb)) return -1;
        if (!Number.isFinite(aa)) return 1;
        return bb - aa;
      });

      renderInventoryTable(sorted);
      setStatus(`Loaded ${sorted?.length ?? 0} rows`);
    } catch (invErr) {
      renderInventoryTable([]);
      setStatus("Error loading inventory");
      showError(invErr?.message || "Failed to load inventory for this distillery.");
    }

    setLoading(false);
  } catch (err) {
    setLoading(false);
    setStatus("Error loading distillery");
    showError(err?.message || "Unknown error loading distillery page.");
  }
})();
