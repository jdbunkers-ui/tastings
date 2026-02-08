import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_barrel_picker_summary";
const LS_KEY = "vr_state_collapsed_v1";

// DOM
const elContent = document.getElementById("content");
const elHint = document.getElementById("hint");
const elSearch = document.getElementById("search");
const elClear = document.getElementById("clear");
const elOpenInventory = document.getElementById("openInventory");

const elStatStores = document.getElementById("stat-stores");
const elStatBarrels = document.getElementById("stat-barrels");
const elStatTastings = document.getElementById("stat-tastings");

// ---------------- Helpers ----------------
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

function renderError(message) {
  elContent.innerHTML = `
    <div class="skin2-card" style="padding:14px;">
      <b>Error:</b> ${escapeHtml(message)}
    </div>
  `;
}

// ---------------- Rendering ----------------
let collapsedStates = loadCollapsedSet();

function render(rows) {
  if (!rows.length) {
    elContent.innerHTML = `<div class="skin2-card" style="padding:14px;">No stores found.</div>`;
    return;
  }

  const groups = groupByState(rows);

  elContent.innerHTML = groups
    .map(([state, items]) => {
      const storeCount = items.length;
      const barrelCount = items.reduce((acc, r) => acc + toInt(r.barrel_pick_count), 0);
      const tastingCount = items.reduce((acc, r) => acc + toInt(r.total_tastings), 0);

      const isCollapsed = collapsedStates.has(state);
      const listId = `state-list-${encodeURIComponent(state)}`;

      const listHtml = items
        .map((r) => {
          const name = r.barrel_picker_name || "Unknown store";
          const city = r.city || "";
          const id = r.barrel_picker_id || "";

          const barrels = toInt(r.barrel_pick_count);
          const tastings = toInt(r.total_tastings);

          const href = id ? buildPickerHref(id) : "#";

          return `
            <div class="skin2-row" style="display:flex;justify-content:space-between;gap:12px;padding:10px 10px;border:1px solid var(--s2-border);border-radius:14px;background:rgba(255,255,255,0.62);">
              <div>
                <div style="font-weight:800;font-size:13px;">
                  <a href="${escapeHtml(href)}" style="color:var(--s2-link);text-decoration:underline;">
                    ${escapeHtml(name)}
                  </a>
                </div>
                <div style="margin-top:2px;font-size:12px;color:var(--s2-text-muted);">
                  ${city ? `${escapeHtml(city)} • ` : ""}<span style="font-family:var(--s2-font-mono);">${escapeHtml(state)}</span>
                </div>
              </div>
              <div style="text-align:right;white-space:nowrap;">
                <div style="font-weight:900;font-size:14px;">${escapeHtml(String(barrels))}</div>
                <div style="margin-top:2px;font-size:12px;color:rgba(122,103,88,0.78);">
                  ${escapeHtml(String(tastings))} tastings
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="skin2-card" style="padding:14px;margin-top:12px;">
          <button
            type="button"
            data-state-toggle="1"
            data-state="${escapeHtml(state)}"
            aria-controls="${escapeHtml(listId)}"
            aria-expanded="${isCollapsed ? "false" : "true"}"
            style="
              width:100%;
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap:10px;
              cursor:pointer;
              border:1px solid var(--s2-border);
              background:rgba(255,255,255,0.55);
              color:var(--s2-text);
              border-radius:14px;
              padding:10px 12px;
              font-size:13px;
            "
          >
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-weight:900;letter-spacing:0.3px;">${escapeHtml(state)}</span>
              <span style="color:rgba(122,103,88,0.78);font-size:12px;">
                ${escapeHtml(String(storeCount))} store${storeCount === 1 ? "" : "s"} •
                ${escapeHtml(String(barrelCount))} picks •
                ${escapeHtml(String(tastingCount))} tastings
              </span>
            </div>

            <span style="font-family:var(--s2-font-mono);opacity:0.8;">
              ${isCollapsed ? "+" : "–"}
            </span>
          </button>

          <div id="${escapeHtml(listId)}" style="margin-top:10px;display:${isCollapsed ? "none" : "grid"};gap:8px;">
            ${listHtml}
          </div>
        </div>
      `;
    })
    .join("");

  // Wire up toggles (event delegation would also work; this is simple)
  elContent.querySelectorAll('[data-state-toggle="1"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const state = btn.getAttribute("data-state") || "—";
      const listId = btn.getAttribute("aria-controls");
      const listEl = listId ? document.getElementById(listId) : null;
      if (!listEl) return;

      const currentlyExpanded = btn.getAttribute("aria-expanded") === "true";
      const nextExpanded = !currentlyExpanded;

      btn.setAttribute("aria-expanded", nextExpanded ? "true" : "false");

      // update +/- glyph
      const glyph = btn.querySelector("span:last-child");
      if (glyph) glyph.textContent = nextExpanded ? "–" : "+";

      listEl.style.display = nextExpanded ? "grid" : "none";

      // persist
      if (nextExpanded) collapsedStates.delete(state);
      else collapsedStates.add(state);

      saveCollapsedSet(collapsedStates);
    });
  });
}

// ---------------- Filter / Stats ----------------
let allRows = [];

function applyFilter() {
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

  render(filtered);
}

// ---------------- Load ----------------
async function load() {
  if (elHint) elHint.textContent = "Loading…";
  elContent.innerHTML = `<div class="skin2-card" style="padding:14px;">Loading stores…</div>`;

  const { data, error } = await supabase
    .from(VIEW_NAME)
    .select("state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings")
    .order("state", { ascending: true })
    .order("barrel_picker_name", { ascending: true })
    .order("city", { ascending: true });

  if (error) {
    if (elHint) elHint.textContent = "Error";
    renderError(error.message || String(error));
    return;
  }

  allRows = data || [];
  applyFilter();
}

// ---------------- Events ----------------
if (elSearch) elSearch.addEventListener("input", applyFilter);

if (elClear) {
  elClear.addEventListener("click", () => {
    elSearch.value = "";
    applyFilter();
  });
}

if (elOpenInventory) {
  elOpenInventory.addEventListener("click", () => {
    window.location.href = "./index_skin2.html";
  });
}

// Boot
load();
