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

  const qpSingle = (url.searchParams.get("single_barrel_id") || "").trim();
  if (qpSingle) return qpSingle;

  const qp = (url.searchParams.get("id") || "").trim();
  if (qp) return qp;

  // Legacy path style: /barrel/<id>
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("barrel");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];

  return "";
}

function selfUrlForId(singleBarrelId) {
  const id = encodeURIComponent(singleBarrelId ?? "");
  return `${window.location.pathname}?single_barrel_id=${id}`;
}

/**
 * ✅ Unwind [[...]] emphasis:
 * - remove the bracket tokens
 * - render as plain text (escaped)
 */
function notesToHtml(raw) {
  const s = String(raw ?? "");
  if (!s) return "";
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

    <style>
      /* Tighter, less dominant specs */
      .spec-grid{
        display:grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap:8px;
        margin-top: 8px;
      }

      .spec-item{
        border: 1px solid rgba(216, 207, 195, 0.85);
        background: rgba(255,255,255,0.52);
        border-radius: 12px;
        padding: 8px 10px;
        min-width: 0;
      }

      .spec-label{
        font-size: 11px;
        line-height: 1.15;
        color: rgba(43,29,20,0.68);
        letter-spacing: .18px;
        margin-bottom: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .spec-value{
        font-size: 13px;
        line-height: 1.2;
        font-weight: 700;
        color: rgba(43,29,20,0.90);
        word-break: break-word;
      }

      @media (max-width: 960px){
        .spec-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 560px){
        .spec-grid{ grid-template-columns: 1fr; }
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

  // Headline
  const headline = `${brand}` + (expr ? ` - ${expr}` : "") + (pick ? ` (${pick})` : "");
  if (titleEl) titleEl.textContent = headline;

  const rowStyle = "font-size:15px; line-height:1.2; font-weight:700; margin-top:6px;";
  const labelStyle = "opacity:.75;";

  // Distillery line
  if (subtitleEl) {
    if (distId) {
      const href = `../distilleries/index.html?distillery_id=${encodeURIComponent(distId)}`;
      subtitleEl.innerHTML = `
        <div style="${rowStyle}">
          <span style="${labelStyle}">Distillery:</span>
          <a href="${escapeHtml(href)}">${escapeHtml(dist)}</a>
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

  // Barrel picker line
  if (pickerLineEl) {
    if (pickerId && pickerDisplay !== "N/A") {
      const href = `../barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(pickerId)}`;
      pickerLineEl.innerHTML = `
        <div style="${rowStyle}">
          <span style="${labelStyle}">Barrel Picker:</span>
          <a href="${escapeHtml(href)}">${escapeHtml(pickerDisplay)}</a>
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

  // ✅ MSRP + description (IDs removed)
  if (msrpLineEl) {
    const desc = String(barrel?.single_barrel_description ?? "").trim();

    msrpLineEl.innerHTML = `
      <div style="${rowStyle}">
        <span style="${labelStyle}">MSRP:</span> ${escapeHtml(msrp)}
      </div>

      ${
        desc
          ? `
            <div style="margin-top:6px; font-size:14px; line-height:1.35; color: rgba(43,29,20,0.88);">
              ${escapeHtml(desc)}
            </div>
          `
          : ""
      }
    `;
  }

  // Composite score
  if (compositeEl) {
    const composite = fmt2(barrel?.score);
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
    <table class="sensory-table">
      <thead>
        <tr>
          <th class="no-wrap">Date</th>
          <th class="score-head">Score</th>
          <th>Nose Notes</th>
          <th class="score-head">Score</th>
          <th>Palate Notes</th>
          <th class="score-head">Score</th>
          <th>Finish Notes</th>
          <th class="num">Final</th>
        </tr>
      </thead>
      <tbody>
        ${sorted
          .map(
            (t) => `
              <tr>
                <td class="mono no-wrap">
                  ${
                    t?.new_update
                      ? `<img
                           src="../assets/img/logo/gold_spinning_star.gif"
                           alt="Recently updated tasting"
                           style="height:16px; width:16px; vertical-align:middle; margin-right:6px;"
                         />`
                      : ""
                  }
                  ${escapeHtml(fmt(t.flight_date))}
                </td>
                <td class="score-cell"><b>${escapeHtml(fmt(t.nose_score))}</b></td>
                <td class="notes">${notesToHtml(fmt(t.nose_notes, ""))}</td>
                <td class="score-cell"><b>${escapeHtml(fmt(t.palate_score))}</b></td>
                <td class="notes">${notesToHtml(fmt(t.palate_notes, ""))}</td>
                <td class="score-cell"><b>${escapeHtml(fmt(t.finish_score))}</b></td>
                <td class="notes">${notesToHtml(fmt(t.finish_notes, ""))}</td>
                <td class="num"><b>${escapeHtml(fmt1(t.score))}</b></td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>

    <style>
      table.sensory-table tbody tr:nth-child(even){ background: rgba(246, 241, 234, 0.75); }
      table.sensory-table tbody tr:nth-child(odd){ background: rgba(255, 255, 255, 0.62); }
      table.sensory-table tbody tr:hover{ background: rgba(225, 182, 106, 0.18); }

      .no-wrap{ white-space: nowrap; }

      th.score-head{ text-align: center; white-space: nowrap; }
      td.score-cell{ text-align: center; white-space: nowrap; }
      th.num,
      td.num {
        text-align: center;
        white-space: nowrap;
      }
    </style>
  `;
}

function renderFoesStyles() {
  return `
    <style>
      .foe-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        margin-bottom:10px;
      }
      .foe-title{
        font-weight: 900;
        font-size: 13px;
      }
      .foe-count{
        font-size: 12px;
        color: var(--muted2);
        white-space: nowrap;
      }

      .foe-list{
        display:grid;
        gap: 0;
        border: 1px solid var(--border);
        border-radius: 14px;
        overflow: hidden;
        background: rgba(255,255,255,0.62);
      }

      .foe-row{
        display:grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: start;
        padding: 10px 10px;
        border-bottom: 1px solid rgba(216, 207, 195, 0.85);
      }
      .foe-row:last-child{ border-bottom:none; }

      .foe-row:nth-child(even){ background: rgba(246, 241, 234, 0.75); }
      .foe-row:nth-child(odd){ background: rgba(255, 255, 255, 0.62); }
      .foe-row:hover{ background: rgba(225, 182, 106, 0.18); }

      .foe-row-title{
        font-weight: 600;
        font-size: 13px;
      }
      .foe-row-sub{
        margin-top: 2px;
        font-size: 12px;
        color: var(--muted);
      }

      .foe-right{
        text-align: right;
        white-space: nowrap;
      }
      .foe-score{
        font-weight: 600;
        font-size: 14px;
        line-height: 1.15;
      }
      .foe-meta2{
        margin-top: 2px;
        font-size: 12px;
        color: var(--muted2);
      }

      .foe-link{
        color: var(--link);
        text-decoration: none;
      }
      .foe-link:hover{
        color: var(--link-hover);
        text-decoration: underline;
      }
    </style>
  `;
}

function renderFoes({ foe_beat, foe_lost }) {
  const wins = foe_beat || [];
  const losses = foe_lost || [];

  const renderList = (items, kind) => {
    const title = kind === "wins" ? "Wins" : "Losses";
    const icon = kind === "wins" ? "🟩" : "🟥";
    const empty = kind === "wins" ? "No wins found." : "No losses found.";

    return `
      <div class="foe-head">
        <div class="foe-title">${icon} ${title}</div>
        <div class="foe-count">${items.length} item${items.length === 1 ? "" : "s"}</div>
      </div>

      <div class="foe-list">
        ${
          items.length
            ? items
                .map((it) => {
                  const id = fmt(it.single_barrel_id, "");
                  const href = id ? selfUrlForId(id) : "#";

                  const brand = fmt(it.brand_name, "(unknown)");
                  const expr = fmt(it.expression_name, "");
                  const pick = fmt(it.pick_name, "");

                  const date = fmt(it.flight_date, "");
                  const proof = it.proof ? `Proof ${it.proof}` : "";
                  const meta = [date, proof].filter(Boolean).join(" • ");

                  // ✅ hyperlink is ONLY on brand_name
                  const brandHtml = id
                    ? `<a class="foe-link" href="${escapeHtml(href)}" data-barrel-link="1" data-barrel-id="${escapeHtml(id)}">${escapeHtml(brand)}</a>`
                    : `<span>${escapeHtml(brand)}</span>`;

                  const rest = [expr, pick].filter(Boolean).join(" • ");
                  const titleHtml = rest ? `${brandHtml} <span style="opacity:.85;">— ${escapeHtml(rest)}</span>` : brandHtml;

                  return `
                    <div class="foe-row">
                      <div class="foe-left">
                        <div class="foe-row-title">${titleHtml}</div>
                        <div class="foe-row-sub">${escapeHtml(meta)}</div>
                      </div>

                      <div class="foe-right">
                        <div class="foe-score">${escapeHtml(fmt1(it.score))}</div>
                        <div class="foe-meta2">${escapeHtml(it.size_ml ? `${it.size_ml} ml` : "")}</div>
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="muted" style="padding:10px;">${escapeHtml(empty)}</div>`
        }
      </div>
    `;
  };

  const styles = renderFoesStyles();

  if (winsEl) winsEl.innerHTML = `${renderList(wins, "wins")}${styles}`;
  if (lossesEl) lossesEl.innerHTML = `${renderList(losses, "losses")}${styles}`;
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
        "Missing barrel id in URL (expected ?single_barrel_id=<id> or ?id=<id>)";
    }
    if (heroEl) heroEl.innerHTML = `<div class="muted">No barrel id provided.</div>`;
    if (tastingsEl) tastingsEl.innerHTML = `<div class="card muted">No tastings.</div>`;
    if (winsEl) winsEl.innerHTML = `<div class="muted">No wins.</div>`;
    if (lossesEl) lossesEl.innerHTML = `<div class="muted">No losses.</div>`;
    renderDebug({ error: "Missing id" });
    return;
  }

  if (subtitleEl) subtitleEl.textContent = `Loading payload…`;

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
