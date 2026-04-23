import { supabase } from "../assets/js/supabaseClient.js";

const VIEW_PREVIEW = "v_flight_preview";
const VIEW_VOTE_TOTALS = "v_flight_vote_totals";
const VIEW_COMMENTS = "v_flight_comments_approved";
const VIEW_VOTE_TREND = "v_flight_vote_trend";

const elContent = document.getElementById("flightContent");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");
const elStatusPill = document.getElementById("flightStatusPill");
const elSubtitle = document.getElementById("flightSubtitle");

/* =====================================================
   FIXED COLORS BY POSITION
===================================================== */
function getPositionColor(position) {
  const p = Number(position);

  switch (p) {
    case 1:
      return "rgba(37, 99, 235, 0.95)"; // Blue
    case 2:
      return "rgba(220, 38, 38, 0.95)"; // Red
    case 3:
      return "rgba(22, 163, 74, 0.95)"; // Green
    case 4:
      return "rgba(20, 20, 20, 0.95)"; // Black
    default:
      return "rgba(120,120,120,0.95)";
  }
}

let state = {
  flightId: null,
  flightRows: [],
  voteTotals: [],
  comments: [],
  trendRows: [],
  status: null,
  hasVoted: false,
  votedDetailId: null,
};

function setStatus(text) {
  if (elStatus) elStatus.textContent = text ?? "";
}

function setStatusPill(text) {
  if (elStatusPill) elStatusPill.textContent = text ?? "";
}

function showError(message, details) {
  if (!elError) return;

  elError.style.display = "";

  const extra =
    details && typeof details === "object"
      ? `\n\n${JSON.stringify(details, null, 2)}`
      : details
      ? `\n\n${String(details)}`
      : "";

  elError.textContent = `${message}${extra}`;
}

function clearError() {
  if (!elError) return;
  elError.style.display = "none";
  elError.textContent = "";
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isNumberLike(v) {
  if (v == null) return false;
  return Number.isFinite(Number(v));
}

function fmt1(v) {
  return isNumberLike(v) ? Number(v).toFixed(1) : "—";
}

function fmt2(v) {
  return isNumberLike(v) ? Number(v).toFixed(2) : "—";
}

function fmtPct(v) {
  return isNumberLike(v) ? `${Number(v).toFixed(1)}%` : "—";
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  return n < 1 ? "NAS" : n.toFixed(1);
}

function fmtMoney(v) {
  return isNumberLike(v) ? `$${Number(v).toFixed(2)}` : "—";
}

function fmtInt(v) {
  return isNumberLike(v) ? `${Math.trunc(Number(v))}` : "0";
}

function firstRow(rows) {
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function bottleLabel(row) {
  return row?.bottle_expression || row?.bottle_name || `Bottle ${row?.position ?? ""}`;
}

function voteRowLabel(row) {
  if (row?.bottle_expression) return row.bottle_expression;
  if (row?.bottle_name) return row.bottle_name;

  const match = state.flightRows.find(
    (r) =>
      String(r.flight_detail_id || "") === String(row?.flight_detail_id || "") ||
      String(r.single_barrel_id || "") === String(row?.single_barrel_id || "")
  );

  if (match) return bottleLabel(match);

  return `Bottle ${row?.position ?? ""}`.trim();
}

function resolveBottleImage(row) {
  const raw = row.bottle_img_ref || "";
  if (!raw) return "../assets/img/bottles/placeholder.png";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("/") ||
    raw.startsWith("../")
  ) {
    return raw;
  }

  return `../assets/img/bottles/${raw}`;
}

function canVote() {
  return String(state.status || "").toLowerCase() === "published" && !state.hasVoted;
}

/* =====================================================
   STANDINGS
===================================================== */
function renderVoteBars() {
  if (!state.voteTotals.length) {
    return `<div class="flight-empty">No vote totals available yet.</div>`;
  }

  const maxPct = Math.max(
    ...state.voteTotals.map((r) => Number(r.vote_pct || r.vote_percentage || 0)),
    0
  );

  return `
    <div class="flight-bars">
      ${state.voteTotals
        .map((row) => {
          const pct = Number(row.vote_pct || row.vote_percentage || 0);
          const total = Number(row.vote_total || row.total_votes || row.votes || 0);
          const width = maxPct > 0 ? (pct / maxPct) * 100 : 0;
          const color = getPositionColor(row.position);

          return `
            <div class="flight-bar-row">
              <div class="flight-bar-label">${escapeHtml(voteRowLabel(row))}</div>

              <div class="flight-bar-track">
                <div
                  class="flight-bar-fill"
                  style="width:${width.toFixed(2)}%; background:${color};"
                ></div>
              </div>

              <div class="flight-bar-value">
                ${fmtInt(total)} votes • ${fmtPct(pct)}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/* =====================================================
   ANALYST VS CROWD
===================================================== */
function renderAnalystVsCrowd() {
  const topScoreRow =
    [...state.flightRows].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0] ||
    null;

  const crowdRow =
    [...state.voteTotals].sort(
      (a, b) =>
        Number(b.vote_total || b.total_votes || b.votes || 0) -
        Number(a.vote_total || a.total_votes || a.votes || 0)
    )[0] || null;

  const analystName = topScoreRow ? bottleLabel(topScoreRow) : "—";
  const crowdName = crowdRow ? voteRowLabel(crowdRow) : "—";

  return `
    <div class="flight-insight-grid">
      <div class="flight-insight-card">
        <div class="flight-insight-label">Analyst Favorite</div>
        <div class="flight-insight-title">${escapeHtml(analystName)}</div>
        <div class="flight-insight-metric">Score: ${fmt1(topScoreRow?.score)}</div>
      </div>

      <div class="flight-insight-card">
        <div class="flight-insight-label">Crowd Favorite</div>
        <div class="flight-insight-title">${escapeHtml(crowdName)}</div>
        <div class="flight-insight-metric">
          Vote Share: ${fmtPct(crowdRow?.vote_pct || crowdRow?.vote_percentage)}
        </div>
      </div>
    </div>
  `;
}

/* =====================================================
   VOTE RACE
===================================================== */
function renderTrendChart() {
  const canvas = document.getElementById("flightTrendChart");
  const empty = document.getElementById("flightTrendEmpty");

  if (!canvas || !empty) return;

  if (!state.trendRows.length) {
    canvas.classList.add("flight-hidden");
    empty.classList.remove("flight-hidden");
    return;
  }

  canvas.classList.remove("flight-hidden");
  empty.classList.add("flight-hidden");

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 1200;
  const height = 320;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const days = [...new Set(state.trendRows.map((r) => String(r.vote_day)))];

  const maxY = Math.max(
    ...state.trendRows.map((r) => Number(r.cumulative_votes || 0)),
    1
  );

  const xForIndex = (i) =>
    padding.left + (days.length <= 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);

  const yForValue = (v) =>
    padding.top + plotH - (Number(v) / maxY) * plotH;

  const groups = {};
  state.trendRows.forEach((r) => {
    const key = Number(r.position);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  Object.keys(groups).forEach((positionKey) => {
    const rows = groups[positionKey];
    const color = getPositionColor(positionKey);

    const pointByDay = new Map(
      rows.map((r) => [String(r.vote_day), Number(r.cumulative_votes || 0)])
    );

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let running = 0;

    days.forEach((day, idx) => {
      if (pointByDay.has(day)) {
        running = pointByDay.get(day);
      }

      const x = xForIndex(idx);
      const y = yForValue(running);

      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    running = 0;

    days.forEach((day, idx) => {
      if (pointByDay.has(day)) {
        running = pointByDay.get(day);
      }

      const x = xForIndex(idx);
      const y = yForValue(running);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

/* =====================================================
   VALUE CHART
===================================================== */
function renderValueChart() {
  const canvas = document.getElementById("flightValueChart");
  const empty = document.getElementById("flightValueEmpty");

  if (!canvas || !empty) return;

  const rows = state.flightRows.filter(
    (r) => isNumberLike(r.msrp) && isNumberLike(r.score)
  );

  if (!rows.length) {
    canvas.classList.add("flight-hidden");
    empty.classList.remove("flight-hidden");
    return;
  }

  canvas.classList.remove("flight-hidden");
  empty.classList.add("flight-hidden");

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 1200;
  const height = 320;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const minX = Math.min(...rows.map((r) => Number(r.msrp)));
  const maxX = Math.max(...rows.map((r) => Number(r.msrp)));
  const minY = Math.min(...rows.map((r) => Number(r.score)));
  const maxY = Math.max(...rows.map((r) => Number(r.score)));

  const xFor = (v) =>
    padding.left + ((v - minX) / (maxX - minX || 1)) * plotW;

  const yFor = (v) =>
    padding.top + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;

  rows.forEach((row) => {
    const x = xFor(Number(row.msrp));
    const y = yFor(Number(row.score));
    const color = getPositionColor(row.position);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.fillText(`P${row.position}`, x + 10, y + 4);
  });
}

/* =====================================================
   DATA LOAD
===================================================== */
async function fetchPreviewRows() {
  const { data, error } = await supabase
    .from(VIEW_PREVIEW)
    .select("*")
    .eq("is_current", true)
    .order("position");

  if (error) throw error;
  return data || [];
}

async function fetchVoteTotals(flightId) {
  const { data } = await supabase
    .from(VIEW_VOTE_TOTALS)
    .select("*")
    .eq("flight_id", flightId);

  return data || [];
}

async function fetchTrendRows(flightId) {
  const { data } = await supabase
    .from(VIEW_VOTE_TREND)
    .select("*")
    .eq("flight_id", flightId)
    .order("vote_day");

  return data || [];
}

async function fetchComments(flightId) {
  const { data } = await supabase
    .from(VIEW_COMMENTS)
    .select("*")
    .eq("flight_id", flightId);

  return data || [];
}

async function load() {
  try {
    const previewRows = await fetchPreviewRows();

    if (!previewRows.length) {
      setStatus("No active flight.");
      return;
    }

    state.flightRows = previewRows;
    state.flightId = previewRows[0].flight_id;
    state.status = previewRows[0].status;

    const [voteTotals, trendRows, comments] = await Promise.all([
      fetchVoteTotals(state.flightId),
      fetchTrendRows(state.flightId),
      fetchComments(state.flightId),
    ]);

    state.voteTotals = voteTotals;
    state.trendRows = trendRows;
    state.comments = comments;
    state.hasVoted = true;

    render();
  } catch (e) {
    console.error(e);
    setStatus("Error loading flight.");
  }
}

function render() {
  if (!elContent) return;

  elContent.innerHTML = `
    <section class="skin2-card">
      <h2 class="flight-section-title">Flight Analytics</h2>

      <div class="flight-analytics-grid">

        <section class="flight-analytics-panel">
          <h3 class="flight-section-title">Current Standings</h3>
          ${renderVoteBars()}
        </section>

        <section class="flight-analytics-panel">
          <h3 class="flight-section-title">Vote Race</h3>
          <canvas id="flightTrendChart" height="320"></canvas>
          <div id="flightTrendEmpty" class="flight-hidden"></div>
        </section>

        <section class="flight-analytics-panel">
          <h3 class="flight-section-title">Value vs Quality</h3>
          <canvas id="flightValueChart" height="320"></canvas>
          <div id="flightValueEmpty" class="flight-hidden"></div>
        </section>

        <section class="flight-analytics-panel">
          <h3 class="flight-section-title">Analyst vs Crowd</h3>
          ${renderAnalystVsCrowd()}
        </section>

      </div>
    </section>
  `;

  renderTrendChart();
  renderValueChart();
}

window.addEventListener("resize", () => {
  renderTrendChart();
  renderValueChart();
});

load();
