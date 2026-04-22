/* =========================================================
   Honey Barrel Hunter — Skin2 Pickers List Page
   File: assets/js/pickers-page.js
   Adds:
   - text search
   - persistent “only new updates” toggle
   - status line
   - GA4 barrel_picker_click tracking
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

// View
const VIEW_PICKERS = "v_barrel_picker_list";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const elPickerMount = $("pickerMount");
const elToggle = $("pickerNewOnlyToggle");
const elFilter = $("filter");
const elStatus = $("status");

// ---------- State ----------
let ALL_ROWS = [];
let pickerOnlyNew = false;
let QUERY = "";

const KEY_ONLY_NEW = "hbh_pickers_new_only";

// ---------- Root helper ----------
function getRootPrefix() {
  const seg1 = (window.location.pathname.split("/")[1] || "").trim();

  return window.location.hostname.endsWith("github.io") && seg1
    ? `/${seg1}/`
    : "/";
}

const ROOT = getRootPrefix();

// ---------- Helpers ----------
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function setStatus(text) {
  if (!elStatus) return;
  elStatus.textContent = text ?? "";
}

function buildPickerHref(barrelPickerId) {
  const id = encodeURIComponent(barrelPickerId ?? "");
  return `${ROOT}barrel_pickers/index.html?barrel_picker_id=${id}`;
}

function renderErrorInto(el, message) {
  if (!el) return;

  el.innerHTML = `
    <div class="muted-card error">
      <b>Error:</b> ${escapeHtml(message)}
    </div>
  `;
}

// =========================================================
// Rendering
// =========================================================

function renderPickerTable(rows) {
  return `
    <div class="skin2-card" style="padding:12px;">
      <div style="overflow-x:auto;">
        <table class="skin2-table">
          <thead>
            <tr>
              <th class="col-state" style="width:90px;">State</th>
              <th style="width:140px;">City</th>
              <th>Picker</th>
              <th class="col-tastings" style="width:110px;">Tastings</th>
              <th class="col-picks" style="width:90px;">Picks</th>
            </tr>
          </thead>

          <tbody>
            ${
              rows.length
                ? rows.map((r) => {
                    const name =
                      (r.barrel_picker_name || "Unknown store")
                        .toString()
                        .trim();

                    const state =
                      (r.state || "—")
                        .toString()
                        .trim() || "—";

                    const city =
                      (r.city || "—")
                        .toString()
                        .trim();

                    const id =
                      (r.barrel_picker_id || "")
                        .toString()
                        .trim();

                    const href =
                      id ? buildPickerHref(id) : "#";

                    const barrels =
                      toInt(r.barrel_pick_count);

                    const tastings =
                      toInt(r.total_tastings);

                    const star = r.new_update
                      ? rotatingStarSVG({
                          size: 18,
                          style: "margin-left:6px;"
                        })
                      : "";

                    return `
                      <tr>
                        <td class="mono col-state">
                          ${escapeHtml(state)}
                        </td>

                        <td class="mono">
                          ${escapeHtml(city)}
                        </td>

                        <td>
                          <div style="font-weight:800;">
                            <a
                              class="skin2-link"
                              href="${escapeHtml(href)}"
                              data-analytics="barrel-picker-click"
                              data-barrel-picker-id="${escapeHtml(id)}"
                              data-barrel-picker-name="${escapeHtml(name)}"
                            >
                              ${escapeHtml(name)}
                            </a>
                          </div>
                        </td>

                        <td class="mono col-tastings">
                          ${star}${escapeHtml(String(tastings))}
                        </td>

                        <td class="mono col-picks">
                          ${escapeHtml(String(barrels))}
                        </td>
                      </tr>
                    `;
                  }).join("")
                : `
                  <tr>
                    <td colspan="5" style="padding:12px 10px;">
                      No barrel pickers found.
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =========================================================
// Filtering
// =========================================================

function applyFilters() {
  let rows = [...ALL_ROWS];

  if (pickerOnlyNew) {
    rows = rows.filter((r) => r.new_update === true);
  }

  if (QUERY) {
    rows = rows.filter((r) =>
      [
        r.barrel_picker_name,
        r.city,
        r.state,
        r.barrel_picker_id
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(QUERY)
    );
  }

  setStatus(`Loaded ${rows.length} rows`);

  if (elPickerMount) {
    elPickerMount.innerHTML =
      renderPickerTable(rows);
  }
}

// =========================================================
// Load
// =========================================================

async function loadPickers() {
  if (!elPickerMount) return;

  setStatus("Loading…");

  elPickerMount.innerHTML =
    `<div class="muted-card">Loading barrel pickers…</div>`;

  const { data, error } = await supabase
    .from(VIEW_PICKERS)
    .select(
      "state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings,new_update"
    )
    .order("state", { ascending: true })
    .order("city", { ascending: true })
    .order("barrel_picker_name", { ascending: true });

  if (error) {
    setStatus("Error");
    renderErrorInto(
      elPickerMount,
      error.message || String(error)
    );
    return;
  }

  ALL_ROWS = data || [];
  applyFilters();
}

// =========================================================
// Toggle
// =========================================================

function setToggleUI(isOn) {
  if (!elToggle) return;

  elToggle.setAttribute(
    "aria-pressed",
    isOn ? "true" : "false"
  );

  elToggle.title = isOn
    ? "Showing only pickers with recently updated tastings (click to show all)"
    : "Filter pickers to only those with recently updated tastings";
}

function wireToggle() {
  if (!elToggle) return;

  const initial =
    localStorage.getItem(KEY_ONLY_NEW) === "1";

  pickerOnlyNew = initial;
  setToggleUI(initial);

  elToggle.addEventListener("click", () => {
    pickerOnlyNew = !pickerOnlyNew;

    setToggleUI(pickerOnlyNew);

    localStorage.setItem(
      KEY_ONLY_NEW,
      pickerOnlyNew ? "1" : "0"
    );

    applyFilters();
  });
}

// =========================================================
// Search
// =========================================================

function wireSearch() {
  if (!elFilter) return;

  elFilter.addEventListener("input", (e) => {
    QUERY = String(e.target.value || "")
      .toLowerCase()
      .trim();

    applyFilters();
  });
}

// =========================================================
// Boot
// =========================================================

(async function boot() {
  wireToggle();
  wireSearch();
  await loadPickers();
})();
