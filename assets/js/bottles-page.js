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
    .replaceAll("'", "&quot;")
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

  const qpSingle = (url.searchParams.get("single_barrel_id") || "").trim();
  if (qpSingle) return qpSingle;

  const qp = (url.searchParams.get("id") || "").trim();
  if (qp) return qp;

  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("barrel");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];

  return "";
}

function selfUrlForId(singleBarrelId) {
  const id = encodeURIComponent(singleBarrelId ?? "");
  return `${window.location.pathname}?single_barrel_id=${id}`;
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

    <style>
      .spec-grid{
        display:grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap:10px;
        margin-top: 10px;
      }
      .spec-item{
        border: 1px solid var(--border);
        background: rgba(255,255,255,0.62);
        border-radius: 12px;
        padding: 10px 12px;
        min-width: 0;
      }
      .spec-label{
        font-size: 12px;
        color: rgba(43,29,20,0.72);
        letter-spacing: .2px;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .spec-value{
        font-size: 14px;
        font-weight: 800;
        color: rgba(43,29,20,0.92);
        word-break: break-word;
      }
      @media (max-width: 860px){
        .spec-grid{
          grid-template-columns: 1fr;
        }
      }
    </style>
  `;
}

function renderHero(barrel) {
  const brand = fmt(barrel?.brand_name, "Unknown brand");
  const expr = fmt(barrel?.expression_name, "");
  const pick = fmt(barrel?.pick_name, "");

  const dist = fmt(barrel?.distillery_name, "Unknown distillery");
  const distId = fmt(barrel?.distillery_id, "");

  const pickerNameRaw = barrel?.barrel_picker_name;
  const pickerId = fmt(barrel?.barrel_picker_id, "");

  const pickerDisplay = pickerNameRaw ? String(pickerNameRaw) : "N/A";
  const msrp = fmtMoney(barrel?.msrp);

  // Headline stays unchanged (per your request)
  const headline =
    `${brand}` +
    (expr ? ` - ${expr}` : "") +
    (pick ? ` (${pick})` : "");
  if (titleEl) titleEl.textContent = headline;

  // Label line styling (distillery, barrel picker, msrp) = same size + same color
  const rowStyle = "font-size:20px; line-height:1.2; font-weight:700; margin-top:6px;";
  const labelStyle = "opacity:.75;";

  // Distillery line
  if (subtitleEl) {
    if (distId) {
      const href = `../distilleries/index.html?distillery_id=${encodeURIComponent(distId)}`;
      subtitleEl.innerHTML = `
        <div style="${rowStyle}">
          <span style="${labelStyle}">Distillery:</span>
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(dist)}</a>
        </div>
      `;
    } else {
      subtitleEl.innerHTML = `
        <div style="${rowStyle}">
          <span style="${labelStyle}">Distillery:</span> ${escapeHtml(dist)}
        </div>
      `;
    }
  }

  // Barrel picker line (between distillery and msrp)
  if (pickerLineEl) {
    if (pickerId && pickerDisplay !== "N/A") {
      const href = `../barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(pickerId)}`;
      pickerLineEl.innerHTML = `
        <div style="${rowStyle}">
          <span style="${labelStyle}">Barrel Picker:</span>
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pickerDisplay)}</a>
        </div>
      `;
    } else {
      pickerLineEl.innerHTML = `
        <div style="${rowStyle}">
          <span style="${labelStyle}">Barrel Picker:</span> ${escapeHtml(pickerDisplay)}
        </div>
      `;
    }
  }

  // MSRP line (same size + same color as distillery and barrel picker)
  if (msrpLineEl) {
    msrpLineEl.innerHTML = `
      <div style="${rowStyle}">
        <span style="${labelStyle}">MSRP:</span> ${escapeHtml(msrp)}
      </div>
    `;
  }

  // Composite score on the right, predominant
  if (compositeEl) {
    const composite = fmt1(barrel?.score);
    compositeEl.innerHTML = `
      <div style="font-size:12px; opacity:.75; text-transform:uppercase; letter-spacing:.3px;">
        Composite Score
      </div>
      <div style="font-size:40px; font-weight:900; line-height:1; margin-top:2px;">
        ${escapeHtml(composite)}
      </div>
    `;
  }

  // Specs grid
  const specs = [
    { label: "Proof", value: fmt1(barrel?.proof) },
    { label: "Strength", value: fmt(barrel?.bottling_strength_type) },
    { label: "Subtype", value: fmt(barrel?.spirit_subtype) },
    { label: "Age", value: fmtAgeYears(barrel?.age_in_years) },
    { label: "Size", value: barrel?.size_ml ? `${barrel.size_ml} ml` : "—" },

    { label: "Mash Bill", value: fmt(barrel?.mash_bill) },
    { label: "Single Barrel", value: fmtBool(barrel?.single_barrel_ind) },
    { label: "Chill Filtered", value: fmtBool(barrel?.chill_filtered_ind) },
    { label: "Finished", value: fmtBool(barrel?.finished_ind) },
    { label: "Finish Type", value: fmt(barrel?.finished_type) },
  ];

  renderSpecsGrid(specs);

  // keep old hero card hidden
  if (heroEl) {
    heroEl.style.display = "none";
    heroEl.innerHTML = "";
  }
}

function renderTastings(tastings) {
  const sorted = sortByDateDesc(tastings, "flight_date");
  if (hintEl) {
    hintEl.textContent = `${sorted.length} tasting${sorted.length === 1 ? "" : "s"} • sorted by flight date (desc)`;
  }

  if (!sorted.length) {
    if (tastingsEl) tastingsEl.innerHTML = `<div class="card muted">No tastings found.</div>`;
    return;
  }

  if (!tastingsEl) return;

  tastingsEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th class="num">Nose</th>
          <th>Nose Notes</th>
          <th class="num">Palate</th>
          <th>Palate Notes</th>
          <th class="num">Finish</th>
          <th>Finish Notes</th>
          <th class="num">Final</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (t) => `
              <tr>
                <td class="mono">${escapeHtml(fmt(t.flight_date))}</td>
                <td class="num"><b>${escapeHtml(fmt(t.nose_score))}</b></td>
                <td class="notes">${escapeHtml(fmt(t.nose_notes, ""))}</td>
                <td class="num"><b>${escapeHtml(fmt(t.palate_score))}</b></td>
                <td class="notes">${escapeHtml(fmt(t.palate_notes, ""))}</td>
                <td class="num"><b>${escapeHtml(fmt(t.finish_score))}</b></td>
                <td class="notes">${escapeHtml(fmt(t.finish_notes, ""))}</td>
                <td class="num"><b>${escapeHtml(fmt1(t.score))}</b></td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function bottleLabel(x) {
  const brand = fmt(x?.brand_name, "");
  const expr = fmt(x?.expression_name, "");
  const pick = fmt(x?.pick_name, "");
  const parts = [brand, expr].filter(Boolean).join(" — ");
  return pick ? `${parts} • ${pick}` : parts;
}

function renderFoes({ foe_beat, foe_lost }) {
  const wins = foe_beat || [];
  const losses = foe_lost || [];

  if (winsEl) {
    winsEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;">
        <div style="font-weight:800;">🟩 Wins</div>
        <div class="muted" style="font-size:12px;">${wins.length} item${wins.length === 1 ? "" : "s"}</div>
      </div>
      <div class="list" id="wins-list">
        ${
          wins.length
            ? wins
                .map((w) => {
                  const id = fmt(w.single_barrel_id, "");
                  const href = id ? selfUrlForId(id) : "#";
                  return `
                    <div class="row">
                      <div>
                        <div class="title">
                          <a href="${escapeHtml(href)}" data-barrel-link="1" data-barrel-id="${escapeHtml(id)}">
                            ${escapeHtml(bottleLabel(w) || "(unknown bottle)")}
                          </a>
                        </div>
                        <div class="sub">
                          ${escapeHtml(fmt(w.flight_date, ""))}${w.flight_date ? " • " : ""}${escapeHtml(fmt(w.proof ? `Proof ${w.proof}` : ""))}
                        </div>
                      </div>
                      <div class="right">
                        <div class="score">${escapeHtml(fmt1(w.score))}</div>
                        <div class="meta2">${escapeHtml(fmt(w.size_ml ? `${w.size_ml} ml` : ""))}</div>
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="muted">No wins found.</div>`
        }
      </div>
    `;
  }

  if (lossesEl) {
    lossesEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;">
        <div style="font-weight:800;">🟥 Losses</div>
        <div class="muted" style="font-size:12px;">${losses.length} item${losses.length === 1 ? "" : "s"}</div>
      </div>
      <div class="list" id="losses-list">
        ${
          losses.length
            ? losses
                .map((l) => {
                  const id = fmt(l.single_barrel_id, "");
                  const href = id ? selfUrlForId(id) : "#";
                  return `
                    <div class="row">
                      <div>
                        <div class="title">
                          <a href="${escapeHtml(href)}" data-barrel-link="1" data-barrel-id="${escapeHtml(id)}">
                            ${escapeHtml(bottleLabel(l) || "(unknown bottle)")}
                          </a>
                        </div>
                        <div class="sub">
                          ${escapeHtml(fmt(l.flight_date, ""))}${l.flight_date ? " • " : ""}${escapeHtml(fmt(l.proof ? `Proof ${l.proof}` : ""))}
                        </div>
                      </div>
                      <div class="right">
                        <div class="score">${escapeHtml(fmt1(l.score))}</div>
                        <div class="meta2">${escapeHtml(fmt(l.size_ml ? `${l.size_ml} ml` : ""))}</div>
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="muted">No losses found.</div>`
        }
      </div>
    `;
  }
}

function renderDebug(payload) {
  if (!debugEl) return;
  try {
    debugEl.textContent = JSON.stringify(payload, null, 2);
  } catch {
    debugEl.textContent = String(payload ?? "");
  }
}

// -----------------------------
// Load
// -----------------------------
async function load() {
  const barrelId = getBarrelIdFromUrl();
  if (!barrelId) {
    if (subtitleEl) {
      subtitleEl.textContent =
        "Missing barrel id in URL (expected /barrel/<id> or ?id=<id> or ?single_barrel_id=<id>)";
    }
    if (heroEl) heroEl.innerHTML = `<div class="muted">No barrel id provided.</div>`;
    if (tastingsEl) tastingsEl.innerHTML = `<div class="card muted">No tastings.</div>`;
    if (winsEl) winsEl.innerHTML = `<div class="muted">No wins.</div>`;
    if (lossesEl) lossesEl.innerHTML = `<div class="muted">No losses.</div>`;
    renderDebug({ error: "Missing id" });
    return;
  }

  if (subtitleEl) subtitleEl.textContent = `Loading payload for ${barrelId}…`;

  const { data, error } = await supabase.rpc("f_get_barrel_payload", {
    p_single_barrel_id: barrelId,
  });

  if (error) {
    if (subtitleEl) subtitleEl.textContent = "Error loading barrel payload";
    if (heroEl) {
      heroEl.innerHTML = `
        <div class="muted">
          <b>Error:</b> ${escapeHtml(error.message || String(error))}
        </div>
      `;
    }
    renderDebug({ error: error.message || String(error) });
    return;
  }

  const payload = data?.payload ?? data;

  renderDebug(payload);

  const barrel = payload?.barrel || {};
  renderHero(barrel);
  renderTastings(payload?.tastings || []);
  renderFoes({ foe_beat: payload?.foe_beat || [], foe_lost: payload?.foe_lost || [] });
}

document.querySelector(".wrap")?.addEventListener("click", (e) => {
  const a = e.target?.closest?.('a[data-barrel-link="1"]');
  if (!a) return;

  e.preventDefault();
  e.stopPropagation();

  const href = a.getAttribute("href") || "";
  if (!href || href === "#") return;

  try {
    window.history.pushState({}, "", href);
    load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.location.href = href;
  }
});

window.addEventListener("popstate", () => load());

// Boot
load();
