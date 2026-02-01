import { supabase } from "../js/supabaseClient.js";

/**
 * Distillery Skin2 Page
 * File: assets/distillery/distillerySkin2Page.js
 *
 * Renders:
 *  - Distillery profile from public.v_distillery
 *  - Tasted bottles list from public.v_bottle_inventory filtered by distillery_id
 *
 * Links:
 *  - Bottle Expression in table links to ../barrel/index_skin2.html?single_barrel_id=<uuid>
 */

// Photo strategy:
// - If v_distillery.distillery_photo_filename exists -> use that
// - Else fallback to "<distillery_id>.jpg"
// Folder expected: assets/img/distilleries/
// (relative from assets/distillery/ => "../img/distilleries/")
const PHOTO_BASE = "../img/distilleries/";
const DEFAULT_PHOTO_EXT = "jpg";

// Keep the first test simple: load up to N tasted bottles for this distillery.
const BOTTLES_LIMIT = 500;

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function show(el, isShown) {
  if (!el) return;
  el.style.display = isShown ? "" : "none";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "";
}

function showError(msg) {
  const el = document.getElementById("error");
  if (!el) return;
  el.textContent = msg;
  show(el, true);
}

function setLoading(isLoading) {
  show(document.getElementById("loading"), isLoading);
  show(document.getElementById("content"), !isLoading);
}

function safeStr(v, fallback = "N/A") {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function fmt1(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function fmt2(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

function fmtAge(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n < 1.0 ? "NAS" : n.toFixed(1);
}

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildFullAddress(dist) {
  // Prefer full_address if you have it
  const full = (dist.full_address ?? "").toString().trim();
  if (full) return full;

  // Else build from parts (if present in your view/table)
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

function pickExpression(row) {
  // Try likely field names (since your view may differ)
  return (
    row.bottle_expression ??
    row.expression_name ??
    row.bottle_type ??
    row.label ??
    row.brand_name ??
    "—"
  );
}

function barrelHref(singleBarrelId) {
  const id = (singleBarrelId ?? "").toString().trim();
  return id
    ? `../barrel/index_skin2.html?single_barrel_id=${encodeURIComponent(id)}`
    : "";
}

async function fetchDistilleryProfile(distilleryId) {
  const { data, error } = await supabase
    .from("v_distillery")
    .select("*")
    .eq("distillery_id", distilleryId)
    .maybeSingle();

  if (error) throw new Error(`v_distillery fetch failed: ${error.message}`);
  if (!data) throw new Error("No distillery found for that distillery_id.");
  return data;
}

async function fetchTastedBottles(distilleryId) {
  const { data, error } = await supabase
    .from("v_bottle_inventory")
    .select("*")
    .eq("distillery_id", distilleryId)
    .limit(BOTTLES_LIMIT);

  if (error) throw new Error(`v_bottle_inventory fetch failed: ${error.message}`);
  return data ?? [];
}

function renderProfile(dist) {
  const name = safeStr(dist.distillery_name, "Unknown Distillery");
  const state = safeStr(dist.state, "N/A");
  const addressLine = buildFullAddress(dist);
  const desc = safeStr(dist.distillery_description, "No description available yet.");

  setText("distillery-name", name);
  setText("distillery-state", state);
  setText("distillery-address", addressLine);
  setText("distillery-description", desc);

  const mapsLink = document.getElementById("maps-link");
  if (mapsLink) mapsLink.href = buildMapsUrl(name, addressLine);

  // Photo (optional)
  const img = document.getElementById("distillery-photo");
  const photoMissing = document.getElementById("photo-missing");

  if (img) {
    img.src = buildPhotoUrl(dist.distillery_id, dist.distillery_photo_filename);
    img.onerror = () => {
      show(img, false);
      show(photoMissing, true);
    };
  } else {
    // if image element isn't present, don't fail the page
    show(photoMissing, true);
  }
}

function renderBottles(rows) {
  const countEl = document.getElementById("bottles-count");
  if (countEl) countEl.textContent = rows.length ? `(${rows.length})` : "";

  const emptyEl = document.getElementById("bottles-empty");
  const wrapEl = document.getElementById("bottles-table-wrap");
  const tbody = document.getElementById("bottles-tbody");

  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows.length) {
    show(emptyEl, true);
    show(wrapEl, false);
    return;
  }

  show(emptyEl, false);
  show(wrapEl, true);

  // Lightweight ordering: highest score first if present
  const sorted = [...rows].sort((a, b) => {
    const aa = Number(a.score ?? a.avg_score ?? a.composite_score);
    const bb = Number(b.score ?? b.avg_score ?? b.composite_score);
    if (!Number.isFinite(bb) && !Number.isFinite(aa)) return 0;
    if (!Number.isFinite(bb)) return -1;
    if (!Number.isFinite(aa)) return 1;
    return bb - aa;
  });

  for (const row of sorted) {
    const tr = document.createElement("tr");

    const expr = pickExpression(row);
    const subtype = safeStr(row.spirit_subtype, "—");

    const scoreVal = row.score ?? row.avg_score ?? row.composite_score;
    const proofVal =
      row.proof ?? row.bottling_strength ?? row.bottling_strength_type;
    const ageVal = row.age ?? row.age_years ?? row.age_in_years;
    const msrpVal = row.msrp;

    // ✅ Bottle Expression links to Skin2 barrel page
    const href = barrelHref(row.single_barrel_id);
    const exprHtml = href
      ? `<a class="skin2-link" target="_blank" rel="noopener noreferrer" href="${escapeHtml(href)}">${escapeHtml(expr)}</a>`
      : escapeHtml(expr);

    tr.innerHTML = `
      <td>${exprHtml}</td>
      <td class="muted">${escapeHtml(subtype)}</td>
      <td class="num">${fmt1(scoreVal)}</td>
      <td class="num">${fmt1(proofVal)}</td>
      <td class="num">${fmtAge(ageVal)}</td>
      <td class="num">${fmt2(msrpVal)}</td>
    `;

    tbody.appendChild(tr);
  }
}

(async function init() {
  const distilleryId = (qs("distillery_id") || qs("id") || "").trim();

  if (!distilleryId) {
    setLoading(false);
    showError("Missing distillery_id in URL. Example: ?distillery_id=<uuid>");
    return;
  }

  setLoading(true);

  try {
    // 1) Always render profile first (better UX)
    const dist = await fetchDistilleryProfile(distilleryId);
    renderProfile(dist);

    // 2) Then load bottles (if this fails, we still keep the profile visible)
    try {
      const bottles = await fetchTastedBottles(distilleryId);
      renderBottles(bottles);
    } catch (bErr) {
      // Keep page usable; just show an error message
      renderBottles([]);
      showError(bErr?.message || "Failed to load tasted bottles for this distillery.");
    }

    setLoading(false);
  } catch (err) {
    setLoading(false);
    showError(err?.message || "Unknown error loading distillery page.");
  }
})();
