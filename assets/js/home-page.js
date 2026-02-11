import { supabase } from "./supabaseClient.js";

// Views
const VIEW_PICKERS = "v_barrel_picker_summary";
const VIEW_JOURNAL = "v_journal";

// LocalStorage
const LS_KEY = "vr_state_collapsed_v1";

// ---------- DOM (safe lookups) ----------
const $ = (id) => document.getElementById(id);

// Legacy landing (old)
const elContent = $("content");
const elHint = $("hint");
const elSearch = $("search");
const elClear = $("clear");
const elOpenInventory = $("openInventory");

const elStatStores = $("stat-stores");
const elStatBarrels = $("stat-barrels");
const elStatTastings = $("stat-tastings");

// New landing (Phase 10 style)
const elJournalMount = $("journalMount");
const elPickerMount = $("pickerMount");
const elJournalHint = $("journalHint");
const elPickerHint = $("pickerHint");

// ---------- Helpers ----------
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
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
  el.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(message)}</div>`;
}

// =========================================================
// NEW LANDING MODE (tables)
// - Top: v_journal table
// - Bottom: barrel pickers table
// =========================================================

function renderJournalTable(rows) {
  const safeRows = rows ?? [];
  return `
    <div class="skin2-card" style="padding:12px;">
      <div style="overflow-x:auto;">
        <table class="skin2-table">
          <thead>
            <tr>
              <th style="width:120px;">Date</th>
              <th>Update</th>
              <th style="width:90px;">New</th>
            </tr>
          </thead>
          <tbody>
            ${
              safeRows.length
                ? safeRows
                    .map((r) => {
                      const dt = r.create_date ?? "";
                      const notes = r.change_notes ?? "";
                      const isNew = !!r.new_update;
                      return `
                        <tr>
                          <td class="mono">${escapeHtml(dt)}</td>
                          <td>${escapeHtml(notes)}</td>
                          <td>${isNew ? `<span class="skin2-pill">NEW</span>` : ""}</td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="3" style="padding:12px 10px;">No updates yet.</td>
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

  if (elJournalHint) elJournalHint.textContent = "Loading…";
  elJournalMount.innerHTML = `<div class="muted-card">Loading updates…</div>`;

  // NOTE: your view currently LIMIT 6; if you want "all records", remove LIMIT from the view.
  const { data, error } = await supabase
    .from(VIEW_JOURNAL)
    .select("journal_id,change_notes,create_date,new_update")
    .order("create_date", { ascending: false });

  if (error) {
    if (elJournalHint) elJournalHint.textContent = "Error";
    renderErrorInto(elJournalMount, error.message || String(error));
    return;
  }

  const rows = data || [];
  if (elJournalHint) elJournalHint.textContent = `${rows.length} update${rows.length === 1 ? "" : "s"}`;
  elJournalMount.innerHTML = renderJournalTable(rows);
}

function renderPickerTable(rows) {
  const safeRows = rows ?? [];

  return `
    <div class="skin2-card" style="padding:12px;">
      <div style="overflow-x:auto;">
        <table class="skin2-table">
          <thead>
            <tr>
              <th>Picker</th>
              <th style="width:90px;">State</th>
              <th style="width:90px;">Picks</th>
              <th style="width:110px;">Tastings</th>
            </tr>
          </thead>
          <tbody>
            ${
              safeRows.length
                ? safeRows
                    .map((r) => {
                      const name = r.barrel_picker_name || "Unknown store";
                      const state = (r.state || "—").trim() || "—";
                      const city = r.city || "";
                      const id = r.barrel_picker_id || "";
                      const href = id ? buildPickerHref(id) : "#";

                      const barrels = toInt(r.barrel_pick_count);
                      const tastings = toInt(r.total_tastings);

                      return `
                        <tr>
                          <td>
                            <div style="font-weight:800;">
                              <a class="skin2-link" href="${escapeHtml(href)}">${escapeHtml(name)}</a>
                            </div>
                            ${
                              city
                                ? `<div class="mono" style="font-size:12px; opacity:0.75; margin-top:2px;">${escapeHtml(city)}</div>`
                                : ``
                            }
                          </td>
                          <td class="mono">${escapeHtml(state)}</td>
                          <td class="mono" style="text-align:right;">${escapeHtml(String(barrels))}</td>
                          <td class="mono" style="text-align:right;">${escapeHtml(String(tastings))}</td>
                        </tr>
                      `;
                    })
                    .join("")
                : `
                  <tr>
                    <td colspan="4" style="padding:12px 10px;">No barrel pickers found.</td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function loadPickerSectionTable() {
  if (!elPickerMount) return;

  if (elPickerHint) elPickerHint.textContent = "Loading…";
  elPickerMount.innerHTML = `<div class="muted-card">Loading barrel pickers…</div>`;

  const { data, error } = await supabase
    .from(VIEW_PICKERS)
    .select("state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings")
    .order("state", { ascending: true })
    .order("barrel_picker_name", { ascending: true })
    .order("city", { ascending: true });

  if (error) {
    if (elPickerHint) elPickerHint.textContent = "Error";
    renderErrorInto(elPickerMount, error.message || String(error));
    return;
  }

  const rows = data || [];
  if (elPickerHint) elPickerHint.textContent = `${rows.length} picker${rows.length === 1 ? "" : "s"} • sorted by state`;
  elPickerMount.innerHTML = renderPickerTable(rows);
}

// =========================================================
// LEGACY LANDING MODE (your current grouped cards UI)
// =========================================================

function groupByState(rows) {
  const map = new Map();
  for (const r of rows) {
    const st = (r.state || "—").trim() || "—";
    if (!map.has(st)) map.set(st, []);
    map.get(st).push(r);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function loadCollapsedSet() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCollapsedSet(set) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

let collapsedStates = loadCollapsedSet();
let allRows = [];

function renderLegacy(rows) {
  if (!elContent) return;

  if (!rows.length) {
    elContent.innerHTML = `<div class="muted-card">No stores found.</div>`;
    return;
  }

  const groups = groupByState(rows);

  elContent.innerHTML = groups
    .map(([state, items]) => {
      const storeCount = items.length;
      const barrelCount = items.reduce((acc, r) => acc + toInt(r.barrel_pick_count), 0);
      const tastingCount = items.reduce((acc, r) => acc + toInt(r.total_tastings), 0);

      const collapsed = collapsedStates.has(state);
      const listId = `state-list-${encodeURIComponent(state)}`;

      const list = items
        .map((r) => {
          const name = r.barrel_picker_name || "Unknown store";
          const city = r.city || "";
          const id = r.barrel_picker_id || "";
          const href = id ? buildPickerHref(id) : "#";

          const barrels = toInt(r.barrel_pick_count);
          const tastings = toInt(r.total_tastings);

          return `
            <div class="row">
              <div>
                <div class="title">
                  <a href="${escapeHtml(href)}">${escapeHtml(name)}</a>
                </div>
                <div class="sub">
                  ${city ? `${escapeHtml(city)} • ` : ""}<span class="mono">${escapeHtml(state)}</span>
                </div>
              </div>
              <div class="right">
                <div class="big">${escapeHtml(String(barrels))}</div>
                <div class="small">${escapeHtml(String(tastings))} tastings</div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="state-block">
          <button
            type="button"
            class="state-header"
            data-state-toggle="1"
            data-state="${escapeHtml(state)}"
            aria-controls="${escapeHtml(listId)}"
            aria-expanded="${collapsed ? "false" : "true"}"
            style="
              width:100%;
              border:0;
              background:transparent;
              padding:0;
              cursor:pointer;
              text-align:left;
            "
          >
            <div class="state">${escapeHtml(state)}</div>
            <div class="meta">
              ${escapeHtml(String(storeCount))} store${storeCount === 1 ? "" : "s"} •
              ${escapeHtml(String(barrelCount))} picks •
              ${escapeHtml(String(tastingCount))} tastings
              <span class="mono" style="margin-left:10px; opacity:0.7;">
                ${collapsed ? "[+]" : "[–]"}
              </span>
            </div>
          </button>

          <div id="${escapeHtml(listId)}" class="list" style="display:${collapsed ? "none" : "grid"};">
            ${list}
          </div>
        </div>
      `;
    })
    .join("");

  // Wire up toggles
  elContent.querySelectorAll('[data-state-toggle="1"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const state = btn.getAttribute("data-state") || "—";
      const listId = btn.getAttribute("aria-controls");
      const listEl = listId ? document.getElementById(listId) : null;
      if (!listEl) return;

      const expanded = btn.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;

      btn.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
      listEl.style.display = nextExpanded ? "grid" : "none";

      if (nextExpanded) collapsedStates.delete(state);
      else collapsedStates.add(state);
      saveCollapsedSet(collapsedStates);

      const monoSpans = btn.querySelectorAll(".meta .mono");
      const glyph = monoSpans.length ? monoSpans[monoSpans.length - 1] : null;
      if (glyph) glyph.textContent = nextExpanded ? "[–]" : "[+]";
    });
  });
}

function applyLegacyFilterAndStats() {
  if (!elSearch) return;

  const q = norm(elSearch.value);

  const filtered = !q
    ? allRows
    : allRows.filter((r) => {
        const hay = [r.state, r.barrel_picker_name, r.city].map(norm).join(" | ");
        return hay.includes(q);
      });

  const storeCount = filtered.length;
  const barrelCount = filtered.reduce((acc, r) => acc + toInt(r.barrel_pick_count), 0);
  const tastingCount = filtered.reduce((acc, r) => acc + toInt(r.total_tastings), 0);

  if (elStatStores) elStatStores.textContent = String(storeCount);
  if (elStatBarrels) elStatBarrels.textContent = String(barrelCount);
  if (elStatTastings) elStatTastings.textContent = String(tastingCount);

  if (elHint) elHint.textContent = `${storeCount} store${storeCount === 1 ? "" : "s"} • grouped by state`;

  renderLegacy(filtered);
}

async function loadLegacy() {
  if (!elContent) return;

  if (elHint) elHint.textContent = "Loading…";
  elContent.innerHTML = `<div class="muted-card">Loading stores…</div>`;

  const { data, error } = await supabase
    .from(VIEW_PICKERS)
    .select("state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings")
    .order("state", { ascending: true })
    .order("barrel_picker_name", { ascending: true })
    .order("city", { ascending: true });

  if (error) {
    if (elHint) elHint.textContent = "Error";
    renderErrorInto(elContent, error.message || String(error));
    return;
  }

  allRows = data || [];
  applyLegacyFilterAndStats();
}

// =========================================================
// Boot + Events (guarded so nothing breaks)
// =========================================================
function wireLegacyEvents() {
  if (elSearch) elSearch.addEventListener("input", applyLegacyFilterAndStats);

  if (elClear) {
    elClear.addEventListener("click", () => {
      if (elSearch) elSearch.value = "";
      applyLegacyFilterAndStats();
    });
  }

  if (elOpenInventory) {
    elOpenInventory.addEventListener("click", () => {
      window.location.href = "./inventory/index.html";
    });
  }
}

(async function boot() {
  const newLandingMode = !!(elJournalMount || elPickerMount);

  if (newLandingMode) {
    // new landing sections
    await loadJournalSection();
    await loadPickerSectionTable();
    return;
  }

  // legacy mode
  wireLegacyEvents();
  await loadLegacy();
})();
