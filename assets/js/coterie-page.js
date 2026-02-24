/* =========================================================
   Honey Barrel Hunter — Skin2 Coterie Page
   File: assets/js/coterie-page.js
   ========================================================= */

import { supabase } from "./supabaseClient.js";
import { rotatingStarSVG } from "./ui/star.js";

const VIEW_NAME = "v_coterie";
const ROW_LIMIT = 300;

// ---------- DOM ----------
const elContent = document.getElementById("coterie-content");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");

// ---------- Helpers ----------
function setStatus(text) {
  if (elStatus) elStatus.textContent = text ?? "";
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
  if (!isNumberLike(v)) return "—";
  return Number(v).toFixed(1);
}

function fmt2(v) {
  if (!isNumberLike(v)) return "—";
  return Number(v).toFixed(2);
}

function fmtMoney(v) {
  if (!isNumberLike(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  if (n < 1.0) return "NAS";
  return n.toFixed(1);
}

function fmtInt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return String(Math.trunc(n));
}

// ---------- Popup Logic ----------
function openCoteriePopup(encodedSingleBarrelId) {
  const url = `../coterie/add.html?single_barrel_id=${encodedSingleBarrelId}`;

  const popup = window.open(
    url,
    "_blank",
    "width=720,height=820,resizable=yes,scrollbars=yes"
  );

  // Refresh when popup closes
  const timer = setInterval(() => {
    if (popup && popup.closed) {
      clearInterval(timer);
      load(); // refresh page after submission
    }
  }, 800);
}

// Expose for inline onclick
window.openCoteriePopup = openCoteriePopup;

// ---------- Render ----------
function renderTable(rows) {
  if (!elContent) return;

  if (!rows || rows.length === 0) {
    elContent.innerHTML = `<div style="padding:12px;">No Coterie rows returned.</div>`;
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
    return;
  }

  const thead = `
    <tr>
      <th>Bottle</th>
      <th>Score</th>
      <th>Reviews</th>
      <th>MSRP</th>
      <th>Proof</th>
      <th>Age</th>
    </tr>
  `;

  const tbody = rows
    .map((r) => {
      const singleBarrelId = (r.single_barrel_id ?? "").toString();
      const encId = encodeURIComponent(singleBarrelId);

      const star = r.new_update
        ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
        : "";

      const bottleLink = `
        <a class="skin2-link" href="../bottles/index.html?single_barrel_id=${encId}">
          ${escapeHtml(r.bottle_expression)}
        </a>
      `;

      const addLink = `
        <div class="coterie-add-link">
          <button
            class="skin2-link"
            onclick="openCoteriePopup('${encId}')"
            style="background:none;border:none;padding:0;cursor:pointer;"
            type="button"
          >
            Add your sensory notes to the Coterie
          </button>
        </div>
      `;

      // Keep search minimal per your decision: bottle_expression only
      const searchHay = (r.bottle_expression ?? "").toString().toLowerCase();

      return `
        <tr class="inv-row"
            data-search="${escapeHtml(searchHay)}"
            data-proof="${escapeHtml(r.proof)}">
          <td>${star}${bottleLink}${addLink}</td>
          <td>${fmt2(r.score)}</td>
          <td>${fmtInt(r.coterie_review_count)}</td>
          <td>${fmtMoney(r.msrp)}</td>
          <td>${fmt1(r.proof)}</td>
          <td>${fmtAge(r.age)}</td>
        </tr>
      `;
    })
    .join("");

  elContent.innerHTML = `
    <table class="skin2-table" aria-label="Coterie bottle table">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  `;

  // inventory-filter.js listens for this to apply search/proof filtering
  window.dispatchEvent(new Event("skin2:inventoryRendered"));
}

// ---------- Data Load ----------
async function load() {
  clearError();
  setStatus("Loading Coterie…");

  try {
    const { data, error } = await supabase
      .from(VIEW_NAME)
      .select("*")
      .limit(ROW_LIMIT);

    if (error) throw error;

    renderTable(data || []);
    setStatus(`Loaded ${data?.length ?? 0} rows`);
  } catch (e) {
    setStatus("Error loading Coterie");
    showError("Failed to load v_coterie from Supabase.", e);
    if (elContent) elContent.innerHTML = "";
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
  }
}

// ---------- Boot ----------
load();
