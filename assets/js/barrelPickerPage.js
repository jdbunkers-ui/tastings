import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_barrel_picker_detail";

// DOM
const elTitle = document.getElementById("bp-title");
const elSubtitle = document.getElementById("bp-subtitle");
const elPhoto = document.getElementById("bp-photo");
const elCard = document.getElementById("bp-card");
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

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function fmt1(x) {
  const n = num(x);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function fmtUsd(x) {
  const n = num(x);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "—";
}

function fmtAge(x) {
  const n = num(x);
  return Number.isFinite(n) && n >= 1 ? n.toFixed(1) : "NAS";
}

function getId() {
  return (new URL(window.location.href).searchParams.get("barrel_picker_id") || "").trim();
}

function imgUrl(f) {
  return f ? `../assets/img/barrel_pickers/${encodeURIComponent(f)}` : "";
}

// Canonical details page is bottles/index.html (takes single_barrel_id)
function hrefBottle(singleBarrelId) {
  return `../bottles/index.html?single_barrel_id=${encodeURIComponent(singleBarrelId)}`;
}

function hrefDistillery(id) {
  return `../distilleries/index.html?distillery_id=${encodeURIComponent(id)}`;
}

// ---------------- Render ----------------
function renderHero(rows) {
  const r = rows[0];

  elTitle.textContent = r.barrel_picker_name || "Barrel Picker";
  elSubtitle.textContent = `${r.city || ""}${r.city && r.state ? ", " : ""}${r.state || ""}` || "—";

  elPhoto.innerHTML = r.barrel_picker_photo_filename
    ? `<img src="${imgUrl(r.barrel_picker_photo_filename)}" alt="Barrel picker photo" />`
    : `<div class="muted">No image</div>`;

  elCard.innerHTML = `
    <p><b>${escapeHtml(r.barrel_picker_type || "")}</b></p>
    <p>${escapeHtml(r.full_address || "")}</p>
    <p>${escapeHtml(r.phone_number || "")}</p>

    <p>
      ${r.google_maps_url ? `<a href="${r.google_maps_url}" target="_blank" rel="noopener">Google Maps</a>` : ""}
      ${r.website_url ? ` · <a href="${r.website_url}" target="_blank" rel="noopener">Website</a>` : ""}
    </p>

    <p>${escapeHtml(r.barrel_picker_description || "")}</p>

    <p><a href="../index.html">← Back to Home</a></p>
  `;
}

function renderTable(rows) {
  elTableTitle.textContent = `Barrel Picks (${rows.length})`;

  if (!rows.length) {
    elTable.innerHTML = `<div class="muted-card">No barrel picks found for this barrel picker.</div>`;
    return;
  }

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
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => {
          const sbid = r.single_barrel_id;
          return `
            <tr>
              <td>${sbid ? `<a href="${hrefBottle(sbid)}">${escapeHtml(r.pick_name || "View")}</a>` : "—"}</td>
              <td>${r.distillery_id ? `<a href="${hrefDistillery(r.distillery_id)}">${escapeHtml(r.distillery_name || "")}</a>` : "—"}</td>
              <td>${sbid ? `<a href="${hrefBottle(sbid)}">${escapeHtml(r.brand_name || "")} — ${escapeHtml(r.expression_name || "")}</a>` : "—"}</td>
              <td class="num"><b>${fmt1(r.score)}</b></td>
              <td class="num">${fmt1(r.proof)}</td>
              <td class="num">${fmtAge(r.age_statement)}</td>
              <td class="num">${fmtUsd(r.msrp)}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderError(msg) {
  elSubtitle.textContent = msg;
  elCard.innerHTML = `<div class="muted-card"><b>Error:</b> ${escapeHtml(msg)}</div>`;
  elTable.innerHTML = "";
}

// ---------------- Load ----------------
async function load() {
  const id = getId();
  if (!id) {
    renderError("Missing barrel_picker_id in URL. Expected ?barrel_picker_id=<uuid>.");
    elDebug.textContent = JSON.stringify({ error: "Missing barrel_picker_id" }, null, 2);
    return;
  }

  const { data, error } = await supabase
    .from(VIEW_NAME)
    .select("*")
    .eq("barrel_picker_id", id);

  if (error) {
    renderError(error.message || String(error));
    elDebug.textContent = JSON.stringify({ error }, null, 2);
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    renderError(`No rows returned for barrel_picker_id=${id}`);
    elDebug.textContent = JSON.stringify({ barrel_picker_id: id, rows: 0 }, null, 2);
    return;
  }

  renderHero(rows);
  renderTable(rows);
  elDebug.textContent = JSON.stringify(rows, null, 2);
}

load();
