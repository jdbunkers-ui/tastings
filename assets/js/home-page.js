import { supabase } from "./supabaseClient.js";

// Views
const VIEW_PICKERS = "v_barrel_picker_list";
const VIEW_JOURNAL = "v_journal";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const elJournalMount = $("journalMount");
const elPickerMount = $("pickerMount");

// ---------- State ----------
let pickerOnlyNew = !!(window.HBH_PickerFilter && window.HBH_PickerFilter.onlyNew);

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
  return `./barrel_pickers/index.html?barrel_picker_id=${id}`;
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
// Journal Section (Top)
// =========================================================

function renderJournalTable(rows) {
  return `
    <div class="skin2-card" style="padding:12px;">
      <div style="overflow-x:auto;">
        <table class="skin2-table">
          <thead>
            <tr>
              <th style="width:140px;">Date</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map((r) => {
                      const star = r.new_update
                        ? `<img 
                             src="./assets/img/logo/gold_spinning_star.gif"
                             alt="New update"
                             style="height:18px; vertical-align:middle; margin-right:6px;"
                           />`
                        : "";

                      return `
                        <tr>
                          <td class="mono">
                            ${star}${escapeHtml(r.create_date)}
                          </td>
                          <td>${escapeHtml(r.change_notes)}</td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="2" style="padding:12px 10px;">
                      No updates yet.
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

async function loadJournalSection() {
  if (!elJournalMount) return;

  elJournalMount.innerHTML = `<div class="muted-card">Loading updates…</div>`;

  const { data, error } = await supabase
    .from(VIEW_JOURNAL)
    .select("journal_id,change_notes,create_date,new_update")
    .order("create_date", { ascending: false });

  if (error) {
    renderErrorInto(elJournalMount, error.message || String(error));
    return;
  }

  elJournalMount.innerHTML = renderJournalTable(data || []);
}

// =========================================================
// Barrel Pickers Section (Bottom)
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

                      // ⭐ Star when picker has a recent tasting
                      const star = r.new_update
                        ? `<img
                             src="./assets/img/logo/gold_spinning_star.gif"
                             alt="New tasting"
                             style="height:18px; vertical-align:middle; margin-left:6px;"
                           />`
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

  // Show different loading message based on filter state
  elPickerMount.innerHTML = pickerOnlyNew
    ? `<div class="muted-card">Loading recently updated barrel pickers…</div>`
    : `<div class="muted-card">Loading barrel pickers…</div>`;

  // Build query (filter at DB level)
  let q = supabase
    .from(VIEW_PICKERS)
    .select("state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings,new_update");

  if (pickerOnlyNew) {
    q = q.eq("new_update", true);
  }

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
// Filter Wiring
// =========================================================

function wirePickerFilterListener() {
  window.addEventListener("hbh:pickerFilterChanged", (e) => {
    const onlyNew = !!(e && e.detail && e.detail.onlyNew);

    // Only reload if state actually changed
    if (onlyNew === pickerOnlyNew) return;

    pickerOnlyNew = onlyNew;
    loadPickerSection();
  });
}

// =========================================================
// Boot
// =========================================================

(async function boot() {
  wirePickerFilterListener();

  // In case the toggle script ran after this module,
  // we re-read the global state once at boot.
  pickerOnlyNew = !!(window.HBH_PickerFilter && window.HBH_PickerFilter.onlyNew);

  await loadJournalSection();
  await loadPickerSection();
})();
