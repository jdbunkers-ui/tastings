import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_barrel_picker_detail";

/**
 * Path to your spinning star GIF (transparent background recommended).
 * Update this path if your asset lives elsewhere.
 */
const STAR_SRC = "../assets/img/spinning-star.gif";

// DOM
const elTitle = document.getElementById("bp-title");
const elSubtitle = document.getElementById("bp-subtitle"); // may be null (HTML removed)
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
  return (
    new URL(window.location.href).searchParams.get("barrel_picker_id") || ""
  ).trim();
}

function imgUrl(f) {
  return f ? `../assets/img/barrel_pickers/${encodeURIComponent(f)}` : "";
}

// Canonical details page is bottles/index.html (takes single_barrel_id)
function hrefBottle(singleBarrelId) {
  return `../bottles/index.html?single_barrel_id=${encodeURIComponent(
    singleBarrelId
  )}`;
}

function hrefDistillery(id) {
  return `../distilleries/index.html?distillery_id=${encodeURIComponent(id)}`;
}

function cityState(r) {
  const city = (r.city || "").trim();
  const state = (r.state || "").trim();
  const line = `${city}${city && state ? ", " : ""}${state}`.trim();
  return line || "—";
}

/**
 * new_update is returned by the view as boolean.
 * If ANY row is true, show the star.
 */
function anyNewUpdate(rows) {
  return rows.some((r) => r?.new_update === true);
}

/**
 * tasting_count is an aggregate in the view; sum it across returned rows
 * so we can show total tastings for the picker on this page.
 */
function sumTastingCount(rows) {
  return rows.reduce((acc, r) => acc + (Number(r?.tasting_count) || 0), 0);
}

function starImgHtml() {
  return `<img class="new-tasting-star" src="${STAR_SRC}" alt="New tasting" />`;
}

// ---------------- Render ----------------
function renderHero(rows) {
  const r = rows[0] || {};

  // Title is required on page; guard anyway
  if (elTitle) elTitle.textContent = r.barrel_picker_name || "Barrel Picker";

  // Subtitle is optional; only set it if element exists
  if (elSubtitle) elSubtitle.textContent = cityState(r);

  if (elPhoto) {
    elPhoto.innerHTML = r.barrel_picker_photo_filename
      ? `<img src="${imgUrl(r.barrel_picker_photo_filename)}" alt="Barrel picker photo" />`
      : `<div class="muted-card">No image</div>`;
  }

  if (elCard) {
    const locationLine = cityState(r);

    elCard.innerHTML = `
      ${
        r.barrel_picker_type
          ? `<p style="margin:0 0 8px;"><b>${escapeHtml(r.barrel_picker_type)}</b></p>`
          : ``
      }

      <!-- City/State now lives INSIDE the card (not standalone) -->
      ${
        locationLine && locationLine !== "—"
          ? `<p class="mono" style="margin:0 0 10px; opacity:0.8;">${escapeHtml(locationLine)}</p>`
          : ``
      }

      ${
        r.full_address
          ? `<p style="margin:0 0 8px;">${escapeHtml(r.full_address)}</p>`
          : ``
      }

      ${
        r.phone_number
          ? `<p style="margin:0 0 10px;">${escapeHtml(r.phone_number)}</p>`
          : ``
      }

      <p style="margin:0 0 10px;">
        ${
          r.google_maps_url
            ? `<a href="${escapeHtml(r.google_maps_url)}" target="_blank" rel="noopener">Google Maps</a>`
            : ""
        }
        ${
          r.website_url
            ? `${r.google_maps_url ? " · " : ""}<a href="${escapeHtml(r.website_url)}" target="_blank" rel="noopener">Website</a>`
            : ""
        }
      </p>

      ${
        r.barrel_picker_description
          ? `<p style="margin:0;">${escapeHtml(r.barrel_picker_description)}</p>`
          : ``
      }
    `;
  }
}

function renderTable(rows) {
  // Show picks count + total tastings, with star if any "new_update" is true
  if (elTableTitle) {
    const tastingsTotal = sumTastingCount(rows);
    const star = anyNewUpdate(rows) ? ` ${starImgHtml()}` : "";
    elTableTitle.innerHTML = `Barrel Picks (${rows.length}) · Tastings (${tastingsTotal})${star}`;
  }

  if (!rows.length) {
    if (elTable) {
      elTable.innerHTML = `<div class="muted-card">No barrel picks found for this barrel picker.</div>`;
    }
    return;
  }

  if (!elTable) return;

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
        ${rows
          .map((r) => {
            const sbid = r.single_barrel_id;

            const barrelCell = sbid
              ? `<a href="${hrefBottle(sbid)}">${escapeHtml(r.pick_name || "View")}</a>`
              : "—";

            const distCell = r.distillery_id
              ? `<a href="${hrefDistillery(r.distillery_id)}">${escapeHtml(
                  r.distillery_name || ""
                )}</a>`
              : "—";

            const bottleLabel = `${escapeHtml(r.brand_name || "")}${
              r.expression_name ? ` — ${escapeHtml(r.expression_name)}` : ""
            }`;

            const bottleCell = sbid
              ? `<a href="${hrefBottle(sbid)}">${bottleLabel}</a>`
              : "—";

            return `
              <tr>
                <td>${barrelCell}</td>
                <td>${distCell}</td>
                <td>${bottleCell}</td>
                <td class="num"><b>${fmt1(r.score)}</b></td>
                <td class="num">${fmt1(r.proof)}</td>
                <td class="num">${fmtAge(r.age_statement)}</td>
                <td class="num">${fmtUsd(r.msrp)}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderError(msg) {
  // Subtitle might not exist now; guard it
  if (elSubtitle) elSubtitle.textContent = msg;
  if (elCard) {
    elCard.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(
      msg
    )}</div>`;
  }
  if (elTable) elTable.innerHTML = "";
}

// ---------------- Load ----------------
async function load() {
  const id = getId();
  if (!id) {
    renderError(
      "Missing barrel_picker_id in URL. Expected ?barrel_picker_id=<uuid>."
    );
    if (elDebug)
      elDebug.textContent = JSON.stringify(
        { error: "Missing barrel_picker_id" },
        null,
        2
      );
    return;
  }

  const { data, error } = await supabase
    .from(VIEW_NAME)
    .select("*")
    .eq("barrel_picker_id", id);

  if (error) {
    renderError(error.message || String(error));
    if (elDebug) elDebug.textContent = JSON.stringify({ error }, null, 2);
    return;
  }

  const rows = data || [];
  if (!rows.length) {
    renderError(`No rows returned for barrel_picker_id=${id}`);
    if (elDebug)
      elDebug.textContent = JSON.stringify(
        { barrel_picker_id: id, rows: 0 },
        null,
        2
      );
    return;
  }

  renderHero(rows);
  renderTable(rows);
  if (elDebug) elDebug.textContent = JSON.stringify(rows, null, 2);
}

load();
