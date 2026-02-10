import { supabase } from "./supabaseClient.js";

const SOURCE = "v_whiskey_compass_notes";

/**
 * Expected columns in SOURCE (view or table):
 * - weight_class (text)
 * - dimension (text)  -- 'nose' | 'palate' | 'finish'
 * - title (text)      -- optional
 * - note (text)       -- optional
 * - score (numeric)   -- optional
 * - created_at (timestamp) -- optional
 *
 * You can change these field names in renderRow() or query.
 */

function $(id) { return document.getElementById(id); }

function titleCase(s) {
  return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildPrevNext(weight, dim) {
  const order = ["nose", "palate", "finish"];
  const i = order.indexOf(dim);
  return {
    prev: i > 0 ? `../${order[i - 1]}/` : null,
    next: i < order.length - 1 ? `../${order[i + 1]}/` : null,
    weightIndex: `../` // useful if you later add whiskey/<weight>/index.html
  };
}

function setPrevNext(weight, dim) {
  const nav = buildPrevNext(weight, dim);

  const prevA = $("nav-prev");
  const nextA = $("nav-next");

  if (prevA) {
    if (nav.prev) {
      prevA.href = nav.prev;
      prevA.removeAttribute("aria-disabled");
      prevA.classList.remove("is-disabled");
    } else {
      prevA.href = "#";
      prevA.setAttribute("aria-disabled", "true");
      prevA.classList.add("is-disabled");
    }
  }

  if (nextA) {
    if (nav.next) {
      nextA.href = nav.next;
      nextA.removeAttribute("aria-disabled");
      nextA.classList.remove("is-disabled");
    } else {
      nextA.href = "#";
      nextA.setAttribute("aria-disabled", "true");
      nextA.classList.add("is-disabled");
    }
  }

  // Header text
  const hWeight = $("page-weight");
  const hDim = $("page-dimension");
  if (hWeight) hWeight.textContent = titleCase(weight);
  if (hDim) hDim.textContent = titleCase(dim);
}

function renderEmpty(container) {
  container.innerHTML = `
    <div class="content-placeholder">
      <em>No tasting entries found.</em><br />
      <span>Add rows in Supabase for this weight + dimension.</span>
    </div>
  `;
}

function renderError(container, message) {
  container.innerHTML = `
    <div class="content-placeholder" style="border-color: rgba(255,80,80,0.6);">
      <strong style="color: rgba(255,140,140,0.95);">Error</strong><br />
      <span>${message}</span>
    </div>
  `;
}

function renderRow(row) {
  const title = row.title || "(Untitled)";
  const note = row.note || "";
  const score = (row.score ?? "").toString();
  const created = row.created_at ? new Date(row.created_at).toLocaleString() : "";

  return `
    <article class="note-card">
      <div class="note-top">
        <div class="note-title">${escapeHtml(title)}</div>
        ${score ? `<div class="note-score">${escapeHtml(score)}</div>` : ""}
      </div>
      ${note ? `<div class="note-body">${escapeHtml(note)}</div>` : ""}
      ${created ? `<div class="note-meta">${escapeHtml(created)}</div>` : ""}
    </article>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadNotes(weight, dim) {
  const container = $("notes");
  if (!container) return;

  container.innerHTML = `
    <div class="content-placeholder">
      <em>Loading tasting entries…</em>
    </div>
  `;

  try {
    // Reference query: filter by weight & dimension.
    // Update SOURCE/column names to match your schema.
    const { data, error } = await supabase
      .from(SOURCE)
      .select("weight_class, dimension, title, note, score, created_at")
      .eq("weight_class", weight)
      .eq("dimension", dim)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      renderError(container, error.message);
      return;
    }

    if (!data || data.length === 0) {
      renderEmpty(container);
      return;
    }

    container.innerHTML = data.map(renderRow).join("");
  } catch (e) {
    renderError(container, e?.message || "Unknown error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const weight = document.documentElement.getAttribute("data-weight") || "";
  const dim = document.documentElement.getAttribute("data-dimension") || "";

  setPrevNext(weight, dim);
  loadNotes(weight, dim);
});
