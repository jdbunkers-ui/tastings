import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

// View
const VIEW_PICKERS = "v_barrel_picker_list";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const elPickerMount = $("pickerMount");
const elToggle = $("pickerNewOnlyToggle");

// ---------- State ----------
let pickerOnlyNew = false;

// ---------- Root helper (matches site-chrome.js ROOT logic) ----------
function getRootPrefix() {
  const seg1 = (window.location.pathname.split("/")[1] || "").trim();
  return window.location.hostname.endsWith("github.io") && seg1 ? `/${seg1}/` : "/";
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
// Pickers
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
                ? rows
                    .map((r) => {
                      const name = r.barrel_picker_name || "Unknown store";
                      const state = (r.state || "—").trim() || "—";
                      const city = r.city || "—";
                      const id = r.barrel_picker_id || "";
                      const href = id ? buildPickerHref(id) : "#";

                      const barrels = toInt(r.barrel_pick_count);
                      const tastings = toInt(r.total_tastings);

                      const star = r.new_update
                        ? rotatingStarSVG({ size: 18, style: "margin-left:6px;" })
                        : "";

                      return `
                        <tr>
                          <td class="mono col-state">${escapeHtml(state)}</td>
                          <td class="mono">${escapeHtml(city)}</td>
                          <td>
                            <div style="font-weight:800;">
                              <a class="skin2-link" href="${escapeHtml(href)}">
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
                    })
                    .join("")
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

async function loadPickerSection() {
  if (!elPickerMount) return;

  elPickerMount.innerHTML = pickerOnlyNew
    ? `<div class="muted-card">Loading recently updated barrel pickers…</div>`
    : `<div class="muted-card">Loading barrel pickers…</div>`;

  let q = supabase
    .from(VIEW_PICKERS)
    .select(
      "state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings,new_update"
    );

  if (pickerOnlyNew) q = q.eq("new_update", true);

  const { data, error } = await q
    .order("state", { ascending: true })
    .order("city", { ascending: true })
    .order("barrel_picker_name", { ascending: true });

  if (error) {
    renderErrorInto(elPickerMount, error.message || String(error));
    return;
  }

  elPickerMount.innerHTML = renderPickerTable(data || []);
}

// =========================================================
// Toggle wiring (local to Pickers page)
// =========================================================

function setToggleUI(isOn) {
  if (!elToggle) return;
  elToggle.setAttribute("aria-pressed", isOn ? "true" : "false");
}

function wireToggle() {
  if (!elToggle) return;

  elToggle.addEventListener("click", () => {
    pickerOnlyNew = !pickerOnlyNew;
    setToggleUI(pickerOnlyNew);
    loadPickerSection();
  });
}

// =========================================================
// Boot
// =========================================================

(async function boot() {
  wireToggle();
  setToggleUI(pickerOnlyNew);
  await loadPickerSection();
})();
