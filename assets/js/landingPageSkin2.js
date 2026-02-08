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
  // plural folder name for consistency
  return `./barrel_pickers/index.html?barrel_picker_id=${id}`;
}

function groupByState(rows) {
  const map = new Map();
  for (const r of rows) {
    const st = (r.state || "—").trim() || "—";
    if (!map.has(st)) map.set(st, []);
    map.get(st).push(r);
  }
  // stable alphabetical order
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
  elContent.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(message)}</div>`;
}

// ---------------- Rendering ----------------
let collapsedStates = loadCollapsedSet();

function render(rows) {
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

      // clickable state header (button for accessibility)
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

      // Persist
      if (nextExpanded) collapsedStates.delete(state);
      else collapsedStates.add(state);
      saveCollapsedSet(collapsedStates);

      // Update [+]/[–] glyph (last .mono span inside meta)
      const monoSpans = btn.querySelectorAll(".meta .mono");
      const glyph = monoSpans.length ? monoSpans[monoSpans.length - 1] : null;
      if (glyph) glyph.textContent = nextExpanded ? "[–]" : "[+]";
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

  elStatStores.textContent = String(storeCount);
  elStatBarrels.textContent = String(barrelCount);
  elStatTastings.textContent = String(tastingCount);

  elHint.textContent = `${storeCount} store${storeCount === 1 ? "" : "s"} • grouped by state`;

  render(filtered);
}

// ---------------- Load ----------------
async function load() {
  elHint.textContent = "Loading…";
  elContent.innerHTML = `<div class="muted-card">Loading stores…</div>`;

  const { data, error } = await supabase
    .from(VIEW_NAME)
    .select("state,barrel_picker_name,city,barrel_picker_id,barrel_pick_count,total_tastings")
    .order("state", { ascending: true })
    .order("barrel_picker_name", { ascending: true })
    .order("city", { ascending: true });

  if (error) {
    elHint.textContent = "Error";
    renderError(error.message || String(error));
    return;
  }

  allRows = data || [];
  applyFilter();
}

// ---------------- Events ----------------
elSearch.addEventListener("input", applyFilter);

elClear.addEventListener("click", () => {
  elSearch.value = "";
  applyFilter();
});

elOpenInventory.addEventListener("click", () => {
  window.location.href = "./index_skin2.html";
});

// Boot
load();
