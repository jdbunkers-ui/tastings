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

function showError(message) {
  if (!elError) return;
  elError.style.display = "";
  elError.textContent = message;
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

function fmt1(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : escapeHtml(v);
}

function fmtMoney(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : escapeHtml(v);
}

function fmtAge(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return "NAS";
  return n.toFixed(1);
}

// ---------- Popup Logic ----------
function openCoteriePopup(singleBarrelId) {
  const url = `../coterie/add.html?single_barrel_id=${singleBarrelId}`;

  const popup = window.open(
    url,
    "_blank",
    "width=720,height=820,resizable=yes,scrollbars=yes"
  );

  // Poll to refresh when popup closes
  const timer = setInterval(() => {
    if (popup && popup.closed) {
      clearInterval(timer);
      load(); // refresh page after submission
    }
  }, 800);
}

// Make globally accessible for inline onclick
window.openCoteriePopup = openCoteriePopup;

// ---------- Render ----------
function renderTable(rows) {
  if (!rows || rows.length === 0) {
    elContent.innerHTML =
      `<div style="padding:12px;">No Coterie rows returned.</div>`;
    window.dispatchEvent(new Event("skin2:inventoryRendered"));
    return;
  }

  const tbody = rows
    .map((r) => {
      const star = r.new_update
        ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
        : "";

      const bottleLink =
        `<a class="skin2-link"
           href="../bottles/index.html?single_barrel_id=${encodeURIComponent(
             r.single_barrel_id
           )}">
           ${escapeHtml(r.bottle_expression)}
         </a>`;

      const addLink =
        `<div class="coterie-add-link">
           <button
             class="skin2-link"
             onclick="openCoteriePopup('${encodeURIComponent(
               r.single_barrel_id
             )}')"
             style="background:none;border:none;padding:0;cursor:pointer;"
           >
             Add your sensory notes to the Coterie
           </button>
         </div>`;

      return `
        <tr class="inv-row"
            data-search="${escapeHtml(
              (r.bottle_expression ?? "").toLowerCase()
            )}"
            data-proof="${escapeHtml(r.proof)}">

          <td>${star}${bottleLink}${addLink}</td>
          <td>${fmt1(r.score)}</td>
          <td>${fmtMoney(r.msrp)}</td>
          <td>${fmt1(r.proof)}</td>
          <td>${fmtAge(r.age)}</td>

        </tr>
      `;
    })
    .join("");

  elContent.innerHTML = `
    <table class="skin2-table" aria-label="Coterie bottle table">
      <thead>
        <tr>
          <th>Bottle</th>
          <th>Score</th>
          <th>MSRP</th>
          <th>Proof</th>
          <th>Age</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
  `;

  // Allow inventory-filter.js to reapply proof + search filter
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
    showError("Failed to load v_coterie.");
    setStatus("Error loading Coterie");
  }
}

// ---------- Boot ----------
load();
