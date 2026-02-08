import { supabase } from "./supabaseClient.js";

const VIEW_NAME = "v_barrel_picker_summary";

// DOM
const elContent = document.getElementById("content");
const elHint = document.getElementById("hint");
const elSearch = document.getElementById("search");
const elClear = document.getElementById("clear");
const elOpenInventory = document.getElementById("openInventory");

const elStatStores = document.getElementById("stat-stores");
const elStatBarrels = document.getElementById("stat-barrels");
const elStatTastings = document.getElementById("stat-tastings");

// Helpers
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(x, fallback = "—") {
  return x === null || x === undefined || x === "" ? fallback : String(x);
}

function toInt(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function groupByState(rows) {
  const map = new Map();
  for (const r of rows) {
    const st = fmt(r.state, "").trim() || "—";
    if (!map.has(st)) map.set(st, []);
    map.get(st).push(r);
  }
  // states already ordered by SQL, but ensure stable alphabetical anyway
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function buildPickerHref(barrelPickerId) {
  const id = encodeURIComponent(barrelPickerId ?? "");
  return `./barrel_pickers/index.html?barrel_picker_id=${id}`;
}

function render(rows) {
  if (!rows.length) {
    elContent.innerHTML = `<div class="muted-card">No stores found.</div>`;
    return;
  }

  const groups = groupByState(rows);

  elContent.innerHTML = groups
    .map(([state, items]) => {
      const list = items
        .map((r) => {
          const name = fmt(r.barrel_picker_name, "Unknown store");
          const city = fmt(r.city, "");
          const barrelCount = toInt(r.barrel_pick_count);
          const tastingCount = toInt(r.total_tastings);
          const id = fmt(r.barrel_picker_id, "");

          const href = id ? buildPickerHref(id) : "#";

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
                <div class="big">${escapeHtml(String(barrelCount))}</div>
                <div class="small">${escapeHtml(String(tastingCount))} tastings</div>
              </div>
            </div>
          `;
        })
        .join("");

      const totalStores = items.length;
      const totalBarrels = items.reduce((acc, r) => acc + toInt(r.barrel_pick_count), 0);
      const totalTastings = items.reduce((acc, r) => acc + toInt(r.total_tastings), 0);

      return `
        <div class="state-block">
          <div class="state-header">
            <div class="state">${escapeHtml(state)}</div>
            <div class="meta">
              ${escapeHtml(String(totalStores))} store${totalStores === 1 ? "" : "s"} •
              ${escapeHtml(String(totalBarrels))} picks •
              ${escapeHtml(String(totalTastings))} tastings
            </div>
          </div>
          <div class="list">${list}</div>
        </div>
      `;
    })
    .join("");
}

function renderError(message) {
  elContent.innerHTML = `<div class="muted-card error"><b>Error:</b> ${escapeHtml(message)}</div>`;
}

// Data
let allRows = [];

function applyFilter() {
  const q = norm(elSearch.value);
  const filtered = !q
    ? allRows
    : allRows.filter((r) => {
        const hay = [
          r.state,
          r.barrel_picker_name,
          r.city,
        ]
          .map(norm)
          .join(" | ");
        return hay.includes(q);
      });

  // Update headline stats based on filtered list
  const storeCount = filtered.length;
  const barrelCount = filtered.reduce((acc, r) => acc + toInt(r.barrel_pick_count), 0);
  const tastingCount = filtered.reduce((acc, r) => acc + toInt(r.total_tastings), 0);

  elStatStores.textContent = String(storeCount);
  elStatBarrels.textContent = String(barrelCount);
  elStatTastings.textContent = String(tastingCount);

  elHint.textContent = `${storeCount} store${storeCount === 1 ? "" : "s"} • grouped by state`;
  render(filtered);
}

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
    renderError(error.message || String(error));
    elHint.textContent = "Error";
    return;
  }

  allRows = data || [];
  applyFilter();
}

// Events
elSearch.addEventListener("input", () => applyFilter());
elClear.addEventListener("click", () => {
  elSearch.value = "";
  applyFilter();
});

elOpenInventory.addEventListener("click", () => {
  // keep it simple; adjust to your actual inventory landing if different
  window.location.href = "./index_skin2.html";
});

// Boot
load();
