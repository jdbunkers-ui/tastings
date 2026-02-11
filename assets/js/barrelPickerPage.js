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
  return new URL(window.location.href).searchParams.get("barrel_picker_id");
}

function imgUrl(f) {
  return f ? `../assets/img/barrel_pickers/${encodeURIComponent(f)}` : "";
}

function hrefBottle(singleBarrelId) {
  return `../bottles/index.html?single_barrel_id=${encodeURIComponent(singleBarrelId)}`;
}

function hrefDistillery(id) {
  return `../distilleries/index.html?distillery_id=${encodeURIComponent(id)}`;
}

function hrefBottle(id) {
  return `../bottles/index.html?bottle_id=${encodeURIComponent(id)}`;
}

// ---------------- Render ----------------
function renderHero(rows) {
  const r = rows[0];

  elTitle.textContent = r.barrel_picker_name;
  elSubtitle.textContent = `${r.city}, ${r.state}`;

  elPhoto.innerHTML = r.barrel_picker_photo_filename
    ? `<img src="${imgUrl(r.barrel_picker_photo_filename)}" />`
    : `<div class="muted">No image</div>`;

  elCard.innerHTML = `
    <p><b>${escapeHtml(r.barrel_picker_type)}</b></p>
    <p>${escapeHtml(r.full_address || "")}</p>
    <p>${escapeHtml(r.phone_number || "")}</p>

    <p>
      ${r.google_maps_url ? `<a href="${r.google_maps_url}" target="_blank">Google Maps</a>` : ""}
      ${r.website_url ? ` · <a href="${r.website_url}" target="_blank">Website</a>` : ""}
    </p>

    <p>${escapeHtml(r.barrel_picker_description || "")}</p>

    <p><a href="../index.html">← Back to Home</a></p>
  `;
}

function renderTable(rows) {
  elTableTitle.textContent = `Barrel Picks (${rows.length})`;

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
        ${rows.map(r => `
          <tr>
            <td><a href="${hrefBarrel(r.single_barrel_id)}">${escapeHtml(r.pick_name)}</a></td>
            <td><a href="${hrefDistillery(r.distillery_id)}">${escapeHtml(r.distillery_name)}</a></td>
            <td><a href="${hrefBottle(r.single_barrel_id)}">${escapeHtml(r.brand_name)} — ${escapeHtml(r.expression_name)}</a></td>
            <td class="num"><b>${fmt1(r.score)}</b></td>
            <td class="num">${fmt1(r.proof)}</td>
            <td class="num">${fmtAge(r.age_statement)}</td>
            <td class="num">${fmtUsd(r.msrp)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function load() {
  const id = getId();
  const { data } = await supabase.from(VIEW_NAME).select("*").eq("barrel_picker_id", id);
  renderHero(data);
  renderTable(data);
  elDebug.textContent = JSON.stringify(data, null, 2);
}

load();
