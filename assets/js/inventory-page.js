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
function show(el, isShown) {
  if (!el) return;
  el.style.display = isShown ? "" : "none";
}

function showError(message, details) {
  if (!elError) return;
  show(elError, true);
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
  show(elError, false);
  elError.textContent = "";
}

function setStatus(text) {
  if (!elStatus) return;
  elStatus.textContent = text ?? "";
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

function fmtMoney(v) {
  if (!isNumberLike(v)) return "—";
  return `$${Number(v).toFixed(2)}`;
}

function fmt1(v) {
  if (!isNumberLike(v)) return "—";
  return Number(v).toFixed(1);
}

function fmtAge(v) {
  if (!isNumberLike(v)) return "NAS";
  const n = Number(v);
  if (n < 1.0) return "NAS";
  return n.toFixed(1);
}

// ---------- Column Classes (match Inventory) ----------
function colClass(col) {
  const map = {
    score: "col-score",
    msrp: "col-msrp",
    proof: "col-proof",
    age: "col-age",
    bottle_expression: "col-expression",
    reviews: "col-reviews",
  };
  return map[col] || "";
}

// ---------- Bottle Link ----------
function barrelLink(singleBarrelId, label) {
  const id = (singleBarrelId ?? "").toString().trim();
  const text = label ?? "";
  if (!id) return escapeHtml(text);

  const href = `../bottles/index.html?single_barrel_id=${encodeURIComponent(id)}`;
  return `<a class="skin2-link" href="${href}">${escapeHtml(text)}</a>`;
}

// ---------- Render ----------
function renderTable(rows) {
  if (!elContent) return;

  if (!rows || rows.length === 0) {
    elContent.innerHTML = `<div style="padding:12px;">No Coterie rows returned.</div>`;
    return;
  }

  const displayCols = [
    "score",
    "msrp",
    "proof",
    "age",
    "bottle_expression",
    "reviews",
  ];

  const thead = displayCols
    .map((c) => {
      const label =
        c === "bottle_expression"
          ? "Bottle Expression"
          : c === "reviews"
          ? "Reviews"
          : c.toUpperCase();

      return `<th class="${colClass(c)}">${label}</th>`;
    })
    .join("");

  const tbody = rows
    .map((r) => {
      const star = r.new_update
        ? rotatingStarSVG({ size: 16, style: "margin-right:6px;" })
        : "";

      const cells = {
        score: fmt1(r.score),
        msrp: fmtMoney(r.msrp),
        proof: fmt1(r.proof),
        age: fmtAge(r.age),
        bottle_expression:
          star +
          barrelLink(r.single_barrel_id, r.bottle_expression),
        reviews: isNumberLike(r.coterie_review_count)
          ? Number(r.coterie_review_count)
          : "—",
      };

      const tds = displayCols
        .map(
          (c) => `<td class="${colClass(c)}">${cells[c]}</td>`
        )
        .join("");

      return `<tr 
        class="coterie-row"
        data-search="${escapeHtml(
          (r.bottle_expression ?? "").toLowerCase()
        )}"
        data-proof="${escapeHtml(r.proof)}"
      >${tds}</tr>`;
    })
    .join("");

  elContent.innerHTML = `
    <table class="skin2-table" aria-label="Coterie table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

// ---------- Load ----------
async function loadCoterie() {
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
  }
}

loadCoterie();
