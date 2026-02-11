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

function sortByDateDesc(arr, key) {
  return [...(arr || [])].sort((a, b) => {
    const da = new Date(a?.[key] || 0).getTime();
    const db = new Date(b?.[key] || 0).getTime();
    return db - da;
  });
}

function getBarrelIdFromUrl() {
  const url = new URL(window.location.href);

  // ✅ Support Skin2 links (?single_barrel_id=<uuid>)
  const qpSingle = (url.searchParams.get("single_barrel_id") || "").trim();
  if (qpSingle) return qpSingle;

  // Existing support (?id=<uuid>)
  const qp = (url.searchParams.get("id") || "").trim();
  if (qp) return qp;

  // Existing support for /barrel/<uuid> paths
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
const hintEl = document.getElementById("tastings-hint");
const debugEl = document.getElementById("debug-json");
const closeBtn = document.getElementById("close-btn");

// -----------------------------
// Rendering
// -----------------------------
function renderHero(barrel) {
  const brand = fmt(barrel?.brand_name, "Unknown brand");
  const dist = fmt(barrel?.distillery_name, "Unknown distillery");
  const distId = fmt(barrel?.distillery_id, "");
  const st = fmt(barrel?.state, "");
  const expr = fmt(barrel?.expression_name, "");
  const pick = fmt(barrel?.pick_name, "");
  const subtype = fmt(barrel?.spirit_subtype, "");
  const id = fmt(barrel?.single_barrel_id, "");

  titleEl.textContent = brand;

  // Distillery → Distillery page link (Skin2)
  if (distId) {
    const href = `../distilleries/index.html?distillery_id=${encodeURIComponent(distId)}`;
    subtitleEl.innerHTML =
      `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(dist)}</a>` +
      (st ? ` • ${escapeHtml(st)}` : "");
  } else {
    subtitleEl.textContent = `${dist}${st ? " • " + st : ""}`;
  }

  const stats = [
    { k: "Avg Score", v: fmt1(barrel?.avg_score) },
    { k: "Composite", v: fmt1(barrel?.score) },
    { k: "Tastings", v: fmt(barrel?.tasting_count ?? barrel?.tastings) },
    { k: "Proof", v: fmt1(barrel?.proof) },
    { k: "Size", v: barrel?.size_ml ? `${barrel.size_ml} ml` : "—" },
    { k: "MSRP", v: `$${fmt2(barrel?.msrp)}` },
  ];

  heroEl.innerHTML = `
    <div class="hero-top">
      <div>
        <div class="pill-row">
          ${expr ? `<span class="pill">${escapeHtml(expr)}</span>` : ""}
          ${pick ? `<span class="pill">${escapeHtml(pick)}</span>` : ""}
          ${subtype ? `<span class="pill">${escapeHtml(subtype)}</span>` : ""}
          <span class="pill">Finished: ${escapeHtml(fmtBool(barrel?.finished_ind))}</span>
          <span class="pill">Chill Filtered: ${escapeHtml(fmtBool(barrel?.chill_filtered_ind))}</span>
        </div>

        <div class="meta" style="margin-top:10px;">
          <span class="mono">ID: ${escapeHtml(id)}</span>
          <button class="btn" id="copy-id" type="button">Copy</button>
        </div>
      </div>

      <div class="stats">
        ${stats
          .map(
            (s) => `
              <div class="stat">
                <div class="k">${escapeHtml(s.k)}</div>
                <div class="v">${escapeHtml(fmt(s.v))}</div>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;

  const copyBtn = document.getElementById("copy-id");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(id);
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 900);
      } catch {
        // ignore
      }
    });
  }
}

function renderTastings(tastings) {
  const sorted = sortByDateDesc(tastings, "flight_date");
  hintEl.textContent = `${sorted.length} tasting${sorted.length === 1 ? "" : "s"} • sorted by flight date (desc)`;

  if (!sorted.length) {
    tastingsEl.innerHTML = `<div class="card muted">No tastings found.</div>`;
    return;
  }

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

function renderDebug(payload) {
  try {
    debugEl.textContent = JSON.stringify(payload, null, 2);
  } catch {
    debugEl.textContent = String(payload ?? "");
  }
}

// -----------------------------
// Events
// -----------------------------
closeBtn?.addEventListener("click", () => {
  try {
    window.close();
  } catch {}
  setTimeout(() => {
    if (!window.closed) {
      if (window.history.length > 1) window.history.back();
      else window.location.href = new URL("../", window.location.href).toString();
    }
  }, 50);
});

async function load() {
  const barrelId = getBarrelIdFromUrl();
  if (!barrelId) {
    subtitleEl.textContent =
      "Missing barrel id in URL (expected /barrel/<id> or ?id=<id> or ?single_barrel_id=<id>)";
    heroEl.innerHTML = `<div class="muted">No barrel id provided.</div>`;
    tastingsEl.innerHTML = `<div class="card muted">No tastings.</div>`;
    winsEl.innerHTML = `<div class="muted">No wins.</div>`;
    lossesEl.innerHTML = `<div class="muted">No losses.</div>`;
    renderDebug({ error: "Missing id" });
    return;
  }

  subtitleEl.textContent = `Loading payload for ${barrelId}…`;

  const { data, error } = await supabase.rpc("f_get_barrel_payload", {
    p_single_barrel_id: barrelId,
  });

  if (error) {
    subtitleEl.textContent = "Error loading barrel payload";
    heroEl.innerHTML = `
      <div class="muted">
        <b>Error:</b> ${escapeHtml(error.message || String(error))}
      </div>
    `;
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
