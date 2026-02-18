import { supabase } from "./supabaseClient.js";

// -----------------------------
// Helpers
// -----------------------------
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

function fmt1(x, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  if (Number.isNaN(n)) return fallback;
  return n.toFixed(1);
}

function fmt2(x, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  if (Number.isNaN(n)) return fallback;
  return n.toFixed(2);
}

function fmtBool(b) {
  if (b === true) return "Yes";
  if (b === false) return "No";
  return "—";
}

function fmtMoney(x, fallback = "—") {
  if (x === null || x === undefined || x === "") return fallback;
  const n = Number(x);
  if (Number.isNaN(n)) return fallback;
  return `$${n.toFixed(2)}`;
}

function fmtAgeYears(ageYears) {
  const n = Number(ageYears);
  if (!Number.isFinite(n) || n < 1) return "NAS";
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function sortByDateDesc(arr, key) {
  return [...(arr || [])].sort((a, b) => {
    const da = new Date(a?.[key] || 0).getTime();
    const db = new Date(b?.[key] || 0).getTime();
    return db - da;
  });
}

function getBarrelIdFromUrl() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("single_barrel_id") || "").trim();
}

function selfUrlForId(singleBarrelId) {
  const id = encodeURIComponent(singleBarrelId ?? "");
  return `${window.location.pathname}?single_barrel_id=${id}`;
}

/* Remove [[...]] emphasis entirely */
function notesToHtml(raw) {
  const s = String(raw ?? "");
  return escapeHtml(s.replace(/\[\[([\s\S]*?)\]\]/g, "$1"));
}

// -----------------------------
// DOM
// -----------------------------
const heroEl = document.getElementById("hero");
const tastingsEl = document.getElementById("tastings");
const winsEl = document.getElementById("wins");
const lossesEl = document.getElementById("losses");
const titleEl = document.getElementById("page-title");
const subtitleEl = document.getElementById("page-subtitle");
const pickerLineEl = document.getElementById("picker-line");
const msrpLineEl = document.getElementById("msrp-line");
const specsEl = document.getElementById("bottle-specs");
const hintEl = document.getElementById("tastings-hint");
const debugEl = document.getElementById("debug-json");
const compositeEl = document.getElementById("composite-score");

// -----------------------------
// Rendering
// -----------------------------
function renderSpecsGrid(specs) {
  if (!specsEl) return;

  specsEl.innerHTML = `
    <div class="spec-grid">
      ${specs
        .map(
          (s) => `
            <div class="spec-item">
              <div class="spec-label">${escapeHtml(s.label)}</div>
              <div class="spec-value">${escapeHtml(fmt(s.value))}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function bottleLabelParts(x) {
  return {
    brand: fmt(x?.brand_name, ""),
    expr: fmt(x?.expression_name, ""),
    pick: fmt(x?.pick_name, ""),
  };
}

function renderFoes({ foe_beat, foe_lost }) {
  const renderList = (items, kind) => {
    const title = kind === "wins" ? "Wins" : "Losses";
    const icon = kind === "wins" ? "🟩" : "🟥";

    return `
      <div class="foe-head">
        <div class="foe-title">${icon} ${title}</div>
        <div class="foe-count">${items.length}</div>
      </div>

      <div class="foe-list">
        ${items
          .map((it) => {
            const id = it.single_barrel_id;
            const href = id ? selfUrlForId(id) : "#";

            const { brand, expr, pick } = bottleLabelParts(it);
            const meta = [fmt(it.flight_date), it.proof ? `Proof ${it.proof}` : ""]
              .filter(Boolean)
              .join(" • ");

            return `
              <div class="foe-row">
                <div class="foe-left">
                  <div class="foe-row-title">
                    ${
                      id
                        ? `<a class="foe-link" href="${escapeHtml(
                            href
                          )}" data-barrel-link="1">${escapeHtml(brand)}</a>`
                        : escapeHtml(brand)
                    }
                    ${expr ? ` — ${escapeHtml(expr)}` : ""}
                    ${pick ? ` • ${escapeHtml(pick)}` : ""}
                  </div>
                  <div class="foe-row-sub">${escapeHtml(meta)}</div>
                </div>

                <div class="foe-right">
                  <div class="foe-score">${escapeHtml(fmt1(it.score))}</div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  };

  if (winsEl) winsEl.innerHTML = renderList(foe_beat || [], "wins");
  if (lossesEl) lossesEl.innerHTML = renderList(foe_lost || [], "losses");
}

// -----------------------------
// Load
// -----------------------------
async function load() {
  const barrelId = getBarrelIdFromUrl();
  if (!barrelId) return;

  const { data } = await supabase.rpc("f_get_barrel_payload", {
    p_single_barrel_id: barrelId,
  });

  const payload = data?.payload ?? data;
  renderFoes({
    foe_beat: payload?.foe_beat || [],
    foe_lost: payload?.foe_lost || [],
  });
}

// SPA navigation
document.querySelector(".wrap")?.addEventListener("click", (e) => {
  const a = e.target?.closest?.('a[data-barrel-link="1"]');
  if (!a) return;
  e.preventDefault();
  history.pushState({}, "", a.href);
  load();
});

window.addEventListener("popstate", load);

// Boot
load();
