import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_barrel_picker_detail";

// DOM
const elTitle = document.getElementById("bp-title");
const elSubtitle = document.getElementById("bp-subtitle");
const elStatus = document.getElementById("bp-status");
const elPhoto = document.getElementById("bp-photo");
const elCard = document.getElementById("bp-card");
const elTable = document.getElementById("bp-table");
const elTableTitle = document.getElementById("bp-table-title");
const elDebug = document.getElementById("bp-debug");

// ---------- Helpers ----------
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(x, fallback = "") {
  return x === null || x === undefined ? fallback : String(x);
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

// (1) Age: if < 1 => NAS
function fmtAgeYears(x) {
  const n = num(x);
  if (!Number.isFinite(n) || n < 1) return "NAS";
  return n.toFixed(1);
}

// (2) Proof + Score: 1 decimal
function fmt1(x, fallback = "—") {
  const n = num(x);
  if (!Number.isFinite(n)) return fallback;
  return n.toFixed(1);
}

// (3) MSRP: dollars, 2 decimals
function fmtUsd(x, fallback = "—") {
  const n = num(x);
  if (!Number.isFinite(n)) return fallback;
  return `$${n.toFixed(2)}`;
}

function getPickerIdFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("barrel_picker_id") || "").trim();
}

// Adjust these paths if your folders differ
function hrefBarrel(singleBarrelId) {
  return `../barrel/index.html?single_barrel_id=${encodeURIComponent(singleBarrelId)}`;
}
function hrefDistillery(distilleryId) {
  // If your folder is singular, change to ../distillery/index.html
  return `../distilleries/index.html?distillery_id=${encodeURIComponent(distilleryId)}`;
}
function hrefBottle(bottleId) {
  // If your folder is singular, change to ../bottle/index.html
  return `../bottles/index.html?bottle_id=${encodeURIComponent(bottleId)}`;
}

function imageUrl(filename) {
  const f = (filename || "").trim();
  if (!f) return "";
  // Update if you store images elsewhere
  return `../assets/img/barrel_pickers/${encodeURIComponent(f)}`;
}

// ---------- Rendering ----------
function renderHero(rows) {
  const r = rows[0];

  const name = fmt(r.barrel_picker_name, "Barrel Picker");
  const type = fmt(r.barrel_picker_type, "");
  const city = fmt(r.city, "");
  const state = fmt(r.state, "");
  const address = fmt(r.full_address, "");
  const phone = fmt(r.phone_number, "");
  const desc = fmt(r.barrel_picker_description, "");
  const website = fmt(r.website_url, "");
  const maps = fmt(r.google_maps_url, "");
  const ig = fmt(r.instagram_url, "");
  const fb = fmt(r.facebook_url, "");
  const photoFilename = fmt(r.barrel_picker_photo_filename, "");
  const img = imageUrl(photoFilename);

  elTitle.textContent = name;
  elSubtitle.textContent = `${city}${city && state ? ", " : ""}${state}`;

  // Photo
  elPhoto.innerHTML = img
    ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" />`
    : `<div class="muted">No image</div>`;

  // Details card
  elCard.innerHTML = `
    <div style="font-weight:800;font-size:18px;">${escapeHtml(name)}</div>
    <div class="bp-meta">
      ${type ? `<div><b>Type:</b> ${escapeHtml(type)}</div>` : ""}
      ${address ? `<div><b>Address:</b> ${escapeHtml(address)}</div>` : ""}
      ${phone ? `<div><b>Phone:</b> ${escapeHtml(phone)}</div>` : ""}
    </div>

    <div class="bp-links">
      ${maps ? `<a href="${escapeHtml(maps)}" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>` : ""}
      ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ""}
      ${ig ? `<a href="${escapeHtml(ig)}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ""}
      ${fb ? `<a href="${escapeHtml(fb)}" target="_blank" rel="noopener noreferrer">Facebook</a>` : ""}
      <a href="../index.html">Back to Home</a>
    </div>

    ${desc ? `<div style="margin-top:12px;line-height:1.45;">${escapeHtml(desc)}</div>` : ""}
  `;
}

function renderTable(rows) {
  // Sort by score desc, then tasting_count desc
  const sorted = [...rows].sort((a, b) => {
    const sa = num(a.score);
    const sb = num(b.score);
    if (Number.isFinite(sa) && Number.isFinite(sb) && sb !== sa) return sb - sa;
    const ta = Number(a.tasting_count) || 0;
    const tb = Number(b.tasting_count) || 0;
    return tb - ta;
  });

  elTableTitle.textContent = `Barrel picks (${sorted.length})`;

  elTable.innerHTML = `
    <table class="bp-table">
      <thead>
        <tr>
          <th>Barrel</th>
          <th>Distillery</th>
          <th>Bottle</th>
          <th class="num">Score</th>
          <th class="num">Proof</th>
          <th class="num">Age</th>
          <th class="num">MSRP</th>
          <th class="num">Tastings</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map((r) => {
          const barrelId = fmt(r.single_barrel_id, "");
          const distId = fmt(r.distillery_id, "");
          const bottleId = fmt(r.bottle_id, "");

          const barrelName = fmt(r.pick_name, "(unnamed barrel)");
          const distName = fmt(r.distillery_name, "—");

          const bottleLabel = [fmt(r.brand_name, ""), fmt(r.expression_name, "")]
            .filter(Boolean)
            .join(" — ") || "—";

          const score = fmt1(r.score);
          const proof = fmt1(r.proof);
          const age = fmtAgeYears(r.age_statement);
          const msrp = fmtUsd(r.msrp);
          const tastings = String(Number(r.tasting_count) || 0);

          return `
            <tr>
              <td>
                ${barrelId
                  ? `<a href="${escapeHtml(hrefBarrel(barrelId))}" target="_blank" rel="noopener noreferrer">${escapeHtml(barrelName)}</a>`
                  : escapeHtml(barrelName)
                }
              </td>
              <td>
                ${distId
                  ? `<a href="${escapeHtml(hrefDistillery(distId))}" target="_blank" rel="noopener noreferrer">${escapeHtml(distName)}</a>`
                  : escapeHtml(distName)
                }
              </td>
              <td>
                ${bottleId
                  ? `<a href="${escapeHtml(hrefBottle(bottleId))}" target="_blank" rel="noopener noreferrer">${escapeHtml(bottleLabel)}</a>`
                  : escapeHtml(bottleLabel)
                }
              </td>
              <td class="num"><b>${escapeHtml(score)}</b></td>
              <td class="num">${escapeHtml(proof)}</td>
              <td class="num">${escapeHtml(age)}</td>
              <td class="num">${escapeHtml(msrp)}</td>
              <td class="num">${escapeHtml(tastings)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderDebug(rows) {
  try { elDebug.textContent = JSON.stringify(rows, null, 2); }
  catch { elDebug.textContent = String(rows ?? ""); }
}

// ---------- Load ----------
async function load() {
  const id = getPickerIdFromUrl();

  if (!id) {
    elSubtitle.textContent = "Missing barrel_picker_id in URL (?barrel_picker_id=<uuid>)";
    elStatus.textContent = "";
    elCard.innerHTML = `<div class="muted">No barrel_picker_id provided.</div>`;
    elTable.innerHTML = `<div class="muted">No barrels.</div>`;
    renderDebug({ error: "Missing barrel_picker_id" });
    return;
  }

  elStatus.textContent = `Loading payload for ${id}…`;

  const { data, error } = await supabase
    .from(VIEW_NAME)
    .select("*")
    .eq("barrel_picker_id", id);

  if (error) {
    elStatus.textContent = "";
    elCard.innerHTML = `<div class="muted"><b>Error:</b> ${escapeHtml(error.message || String(error))}</div>`;
    elTable.innerHTML = "";
    renderDebug({ error: error.message || String(error) });
    return;
  }

  const rows = data || [];
  renderDebug(rows);

  if (!rows.length) {
    elStatus.textContent = "";
    elCard.innerHTML = `<div class="muted">No barrels found for this barrel_picker_id.</div>`;
    elTable.innerHTML = `<div class="muted">No barrels.</div>`;
    return;
  }

  elStatus.textContent = "";
  renderHero(rows);
  renderTable(rows);
}

load();
