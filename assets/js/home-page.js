import { supabase } from "./supabaseClient.js";

// Views
const VIEW_PICKERS = "public.v_barrel_picker_list";
const VIEW_JOURNAL = "v_journal";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);

const elJournalMount = $("journalMount");
const elPickerMount = $("pickerMount");

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
              <th>Picker</th>
              <th class="col-state" style="width:90px;">State</th>
              <th class="col-picks" style="width:90px;">Picks</th>
              <th class="col-tastings" style="width:110px;">Tastings</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map((r) => {
                      const name = r.barrel_picker_name || "Unknown store";
                      const state = (r.state || "—").trim() || "—";
                      const city = r.city || "";
                      const id = r.barrel_picker_id || "";
                      const href = id ? buildPickerHref(id) : "#";

                      const barrels = toInt(r.barrel_pick_count);
                      const tastings = toInt(r.total_tastings);

                      // ✅ Add star when this picker has a tasting created in last 7 days
                      const star = r.new_update
                        ? `<img 
                             src="./assets/img/logo/gold_spinning_star.gif"
                             alt="New tasting"
                             style="height:18px; vertical-align:middle; margin-left:6px;"
                           />`
                        : "";

                      return `
                        <tr>
                          <td>
                            <div style="font-weight:800;">
                              <a class="skin2-link" href="${escapeHtml(href)}">
                                ${escapeHtml(name)}
                              </a>
                            </div>
                            ${
                              city
                                ? `<div class="mono" style="font-size:12px; opacity:0.75; margin-top:2px;">
                                     ${escapeHtml(city)}
                                   </div>`
                                : ""
                            }
                          </td>
                          <td class="mono col-state">${escapeHtml(state)}</td>
                          <td class="mono col-picks">
                            ${escapeHtml(String(barrels))}
                          </td>
                          <td class="mono col-tastings">
                            ${escapeHtml(String(tastings))}${star}
                          </td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="4" style="padding:12px 10px;">
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

  elPickerMount.innerHTML = `<div class="muted-card">Loading barrel pickers…</div>`;

  const { data, error } = await supabase
    .from(VIEW_PICKERS)
    .select("state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings,new_update")
    .order("state", { ascending: true })
    .order("barrel_picker_name", { ascending: true });

  if (error) {
    renderErrorInto(elPickerMount, error.message || String(error));
    return;
  }

  elPickerMount.innerHTML = renderPickerTable(data || []);
}

// =========================================================
// Boot
// =========================================================

(async function boot() {
  await loadJournalSection();
  await loadPickerSection();
})();
