import { supabase } from "../assets/js/supabaseClient.js";

const VIEW_PREVIEW = "v_flight_preview";
const VIEW_VOTE_TOTALS = "v_flight_vote_totals";
const VIEW_COMMENTS = "v_flight_comments_approved";

/*
  Optional trend source for the cumulative line chart.
  Expected shape per row:
  {
    flight_id,
    flight_detail_id,
    bottle_name,
    vote_day,           // YYYY-MM-DD
    cumulative_votes
  }
*/
const VIEW_VOTE_TREND = "v_flight_vote_trend";

const elContent = document.getElementById("flightContent");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");
const elStatusPill = document.getElementById("flightStatusPill");
const elSubtitle = document.getElementById("flightSubtitle");

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
  const n = Number(v);
  return Number.isFinite(n);
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
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "0";
}

function getSessionId() {
  const KEY = "HBH_SESSION_ID";
  let sessionId = localStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

function voteStorageKey(flightId) {
  return `HBH_FLIGHT_VOTED_${flightId}`;
}

function readStoredVote(flightId) {
  try {
    const raw = localStorage.getItem(voteStorageKey(flightId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredVote(flightId, flightDetailId) {
  localStorage.setItem(
    voteStorageKey(flightId),
    JSON.stringify({
      flight_detail_id: flightDetailId,
      voted_at: new Date().toISOString(),
    })
  );
}

function firstRow(rows) {
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function resolveBottleImage(row) {
  const raw = row.bottle_img_ref || row.img_ref || row.image_url || row.image_path || "";
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

function currentFlightStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "published") return "Voting Open";
  if (s === "closed") return "Results Final";
  if (s === "draft") return "Draft";
  if (s === "cancelled") return "Cancelled";
  return status || "Unknown";
}

function canVote() {
  return String(state.status || "").toLowerCase() === "published" && !state.hasVoted;
}

function render() {
  if (!elContent) return;

  if (!state.flightRows.length) {
    elContent.innerHTML = `<div class="flight-empty">No active flight found.</div>`;
    return;
  }

  const headerRow = firstRow(state.flightRows);
  const titleBits = [];

  if (headerRow.flight_name) titleBits.push(headerRow.flight_name);
  if (headerRow.flight_theme) titleBits.push(headerRow.flight_theme);

  if (elSubtitle) {
    elSubtitle.textContent = titleBits.length ? titleBits.join(" • ") : "Blind bourbon tasting";
  }

  setStatusPill(currentFlightStatusLabel(state.status));

  const cardsHtml = state.flightRows
    .map((row) => {
      const isPicked = state.votedDetailId && String(state.votedDetailId) === String(row.flight_detail_id);

      return `
        <article class="flight-card">
          <div class="flight-card-media">
            <img
              src="${escapeHtml(resolveBottleImage(row))}"
              alt="${escapeHtml(row.bottle_expression || row.bottle_name || `Bottle ${row.position}`)}"
              loading="lazy"
            />
          </div>

          <div class="flight-card-body">
            <div class="flight-position">Position ${escapeHtml(row.position)}</div>
            <h3 class="flight-bottle-name">
              ${escapeHtml(row.bottle_expression || row.bottle_name || "Unknown Bottle")}
            </h3>

            <div class="flight-meta">
              <div class="flight-meta-item">
                <span class="flight-meta-label">Proof</span>
                <span class="flight-meta-value">${fmt1(row.proof)}</span>
              </div>

              <div class="flight-meta-item">
                <span class="flight-meta-label">Age</span>
                <span class="flight-meta-value">${fmtAge(row.age)}</span>
              </div>

              <div class="flight-meta-item">
                <span class="flight-meta-label">Distillery</span>
                <span class="flight-meta-value">${escapeHtml(row.distillery_name || "—")}</span>
              </div>

              <div class="flight-meta-item">
                <span class="flight-meta-label">Prior Score</span>
                <span class="flight-meta-value">${fmt2(row.score)}</span>
              </div>
            </div>

            ${
              canVote()
                ? `
                  <button
                    class="flight-vote-btn"
                    type="button"
                    data-flight-detail-id="${escapeHtml(row.flight_detail_id)}"
                  >
                    Vote for this bottle
                  </button>
                `
                : isPicked
                  ? `<div class="flight-voted-badge">Your Pick</div>`
                  : `<div class="flight-voted-badge">Bottle Revealed</div>`
            }
          </div>
        </article>
      `;
    })
    .join("");

  const tableRowsHtml = state.flightRows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.position)}</td>
          <td>${escapeHtml(row.bottle_expression || row.bottle_name || "—")}</td>
          <td>${escapeHtml(row.distillery_name || "—")}</td>
          <td>${fmt1(row.proof)}</td>
          <td>${fmtAge(row.age)}</td>
          <td>${fmt2(row.score)}</td>
          <td>${fmtMoney(row.msrp)}</td>
        </tr>
      `
    )
    .join("");

  const commentsHtml = state.comments.length
    ? state.comments
        .map(
          (row) => `
            <div class="flight-comment">
              <div class="flight-comment-text">${escapeHtml(row.comment_text || row.comment || "")}</div>
              <div class="flight-comment-meta">${escapeHtml(row.display_name || row.author_name || "Approved comment")}</div>
            </div>
          `
        )
        .join("")
    : `<div class="flight-empty">No approved comments yet.</div>`;

  const resultsSectionHtml = state.hasVoted || String(state.status || "").toLowerCase() === "closed"
    ? `
      <section class="skin2-card flight-results-wrap">
        <h2 class="flight-section-title">Vote Results</h2>

        <div id="flightBarsWrap">
          ${renderVoteBars()}
        </div>

        <div id="flightTrendWrap" class="flight-chart-wrap" style="margin-top:16px;">
          <h3 class="flight-section-title" style="margin-bottom:10px;">Vote Trend</h3>
          <canvas id="flightTrendChart" width="1200" height="320" aria-label="Cumulative votes by day"></canvas>
          <div id="flightTrendEmpty" class="flight-empty flight-hidden">Vote trend data is not available yet.</div>
        </div>
      </section>
    `
    : "";

  elContent.innerHTML = `
    <section class="skin2-card">
      <div class="flight-grid">
        ${cardsHtml}
      </div>
    </section>

    <section class="skin2-card" style="margin-top:18px;">
      <h2 class="flight-section-title">Tale of the Tape</h2>
      <div class="skin2-table-wrap">
        <table class="skin2-table" aria-label="Flight tale of the tape">
          <thead>
            <tr>
              <th>Pos</th>
              <th>Bottle</th>
              <th>Distillery</th>
              <th>Proof</th>
              <th>Age</th>
              <th>Prior Score</th>
              <th>MSRP</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </section>

    <section class="skin2-card" style="margin-top:18px;">
      <h2 class="flight-section-title">Comments</h2>
      <div class="flight-comments">
        ${commentsHtml}
      </div>
    </section>

    ${resultsSectionHtml}
  `;

  wireVoteButtons();

  if (state.hasVoted || String(state.status || "").toLowerCase() === "closed") {
    renderTrendChart();
  }
}

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

          return `
            <div class="flight-bar-row">
              <div class="flight-bar-label">${escapeHtml(row.bottle_name || row.bottle_expression || `Bottle ${row.position || ""}`)}</div>
              <div class="flight-bar-track">
                <div class="flight-bar-fill" style="width:${width.toFixed(2)}%;"></div>
              </div>
              <div class="flight-bar-value">${fmtInt(total)} votes • ${fmtPct(pct)}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function wireVoteButtons() {
  const buttons = elContent.querySelectorAll(".flight-vote-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const flightDetailId = btn.getAttribute("data-flight-detail-id");
      if (!flightDetailId) return;

      buttons.forEach((b) => { b.disabled = true; });

      try {
        await submitVote(flightDetailId);
      } catch (e) {
        buttons.forEach((b) => { b.disabled = false; });
        showError("Failed to submit vote.", e);
      }
    });
  });
}

async function submitVote(flightDetailId) {
  clearError();
  setStatus("Submitting vote…");

  const sessionId = getSessionId();

  /*
    Adjust RPC argument names below to match your function exactly.
    Current placeholders:
    - p_flight_detail_id
    - p_session_id
  */
  const { error } = await supabase.rpc("f_submit_flight_vote", {
    p_flight_detail_id: flightDetailId,
    p_session_id: sessionId,
  });

  if (error) {
    throw error;
  }

  writeStoredVote(state.flightId, flightDetailId);
  state.hasVoted = true;
  state.votedDetailId = flightDetailId;

  await loadResultsOnly();

  render();
  setStatus("Vote recorded.");
  scrollResultsIntoView();
}

function scrollResultsIntoView() {
  const resultsWrap = document.getElementById("flightBarsWrap");
  if (resultsWrap) {
    resultsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function loadResultsOnly() {
  const [voteTotals, trendRows] = await Promise.all([
    fetchVoteTotals(state.flightId),
    fetchTrendRows(state.flightId),
  ]);

  state.voteTotals = voteTotals;
  state.trendRows = trendRows;
}

async function fetchPreviewRows() {
  let query = supabase.from(VIEW_PREVIEW).select("*");

  /*
    Assumes v_flight_preview includes one of:
    - is_current = true
    - or a current published flight only
  */
  query = query.eq("is_current", true);

  const { data, error } = await query.order("position", { ascending: true });
  if (error) throw error;

  return data || [];
}

async function fetchVoteTotals(flightId) {
  if (!flightId) return [];

  const { data, error } = await supabase
    .from(VIEW_VOTE_TOTALS)
    .select("*")
    .eq("flight_id", flightId)
    .order("vote_total", { ascending: false });

  if (error) {
    console.warn("Vote totals load failed:", error);
    return [];
  }

  return data || [];
}

async function fetchComments(flightId) {
  if (!flightId) return [];

  const { data, error } = await supabase
    .from(VIEW_COMMENTS)
    .select("*")
    .eq("flight_id", flightId);

  if (error) {
    console.warn("Comments load failed:", error);
    return [];
  }

  return data || [];
}

async function fetchTrendRows(flightId) {
  if (!flightId) return [];

  const { data, error } = await supabase
    .from(VIEW_VOTE_TREND)
    .select("*")
    .eq("flight_id", flightId)
    .order("vote_day", { ascending: true });

  if (error) {
    console.warn("Vote trend load failed:", error);
    return [];
  }

  return data || [];
}

function hydrateVoteState(flightId) {
  const stored = readStoredVote(flightId);
  if (!stored) {
    state.hasVoted = false;
    state.votedDetailId = null;
    return;
  }

  state.hasVoted = true;
  state.votedDetailId = stored.flight_detail_id || null;
}

function renderTrendChart() {
  const canvas = document.getElementById("flightTrendChart");
  const empty = document.getElementById("flightTrendEmpty");
  const wrap = document.getElementById("flightTrendWrap");

  if (!canvas || !wrap || !empty) return;

  if (!Array.isArray(state.trendRows) || !state.trendRows.length) {
    canvas.classList.add("flight-hidden");
    empty.classList.remove("flight-hidden");
    return;
  }

  canvas.classList.remove("flight-hidden");
  empty.classList.add("flight-hidden");

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 1200;
  const cssHeight = 320;

  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = cssWidth;
  const height = cssHeight;

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 18, right: 22, bottom: 42, left: 46 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const days = [...new Set(state.trendRows.map((r) => String(r.vote_day)))];
  const seriesMap = new Map();

  state.trendRows.forEach((row) => {
    const key = String(row.bottle_name || row.bottle_expression || row.flight_detail_id);
    if (!seriesMap.has(key)) seriesMap.set(key, []);
    seriesMap.get(key).push({
      day: String(row.vote_day),
      value: Number(row.cumulative_votes || 0),
    });
  });

  const allValues = state.trendRows.map((r) => Number(r.cumulative_votes || 0));
  const maxY = Math.max(...allValues, 1);

  const xForIndex = (i) =>
    padding.left + (days.length <= 1 ? plotW / 2 : (i / (days.length - 1)) * plotW);

  const yForValue = (v) =>
    padding.top + plotH - (Number(v) / maxY) * plotH;

  ctx.strokeStyle = "rgba(43, 29, 20, 0.16)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (i / 4) * plotH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotW, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotH);
  ctx.lineTo(padding.left + plotW, padding.top + plotH);
  ctx.strokeStyle = "rgba(43, 29, 20, 0.34)";
  ctx.stroke();

  ctx.fillStyle = "rgba(43, 29, 20, 0.72)";
  ctx.font = "11px sans-serif";

  for (let i = 0; i <= 4; i += 1) {
    const value = Math.round((maxY * (4 - i)) / 4);
    const y = padding.top + (i / 4) * plotH;
    ctx.fillText(String(value), 8, y + 4);
  }

  days.forEach((day, idx) => {
    const x = xForIndex(idx);
    const label = day.slice(5);
    ctx.fillText(label, x - 16, height - 14);
  });

  const palette = [
    "rgba(181, 122, 42, 0.95)",
    "rgba(110, 78, 50, 0.95)",
    "rgba(215, 162, 74, 0.95)",
    "rgba(87, 58, 35, 0.95)",
  ];

  Array.from(seriesMap.entries()).forEach(([label, points], idx) => {
    const pointByDay = new Map(points.map((p) => [p.day, p.value]));
    const color = palette[idx % palette.length];

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    days.forEach((day, dayIdx) => {
      const x = xForIndex(dayIdx);
      const y = yForValue(pointByDay.get(day) || 0);

      if (dayIdx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    days.forEach((day, dayIdx) => {
      const x = xForIndex(dayIdx);
      const y = yForValue(pointByDay.get(day) || 0);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    const legendX = padding.left + (idx % 2) * 260;
    const legendY = 10 + Math.floor(idx / 2) * 16;

    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY, 12, 12);

    ctx.fillStyle = "rgba(43, 29, 20, 0.82)";
    ctx.fillText(label, legendX + 18, legendY + 10);
  });
}

async function load() {
  clearError();
  setStatus("Loading flight…");

  try {
    const previewRows = await fetchPreviewRows();

    if (!previewRows.length) {
      state = {
        flightId: null,
        flightRows: [],
        voteTotals: [],
        comments: [],
        trendRows: [],
        status: null,
        hasVoted: false,
        votedDetailId: null,
      };
      setStatus("No active flight found.");
      setStatusPill("No Active Flight");
      render();
      return;
    }

    const header = firstRow(previewRows);
    const flightId = header.flight_id;
    const status = header.flight_status || header.status || null;

    state.flightId = flightId;
    state.flightRows = previewRows;
    state.status = status;

    hydrateVoteState(flightId);

    const [comments, voteTotals, trendRows] = await Promise.all([
      fetchComments(flightId),
      state.hasVoted || String(status || "").toLowerCase() === "closed"
        ? fetchVoteTotals(flightId)
        : Promise.resolve([]),
      state.hasVoted || String(status || "").toLowerCase() === "closed"
        ? fetchTrendRows(flightId)
        : Promise.resolve([]),
    ]);

    state.comments = comments;
    state.voteTotals = voteTotals;
    state.trendRows = trendRows;

    render();
    setStatus(
      state.hasVoted
        ? "Flight loaded. Results unlocked."
        : `Flight loaded. ${canVote() ? "Vote to unlock results." : "Voting is not open."}`
    );
  } catch (e) {
    setStatus("Error loading flight.");
    setStatusPill("Error");
    showError("Failed to load Flight from Supabase.", e);
    if (elContent) {
      elContent.innerHTML = "";
    }
  }
}

window.addEventListener("resize", () => {
  if (state.hasVoted || String(state.status || "").toLowerCase() === "closed") {
    renderTrendChart();
  }
});

load();
