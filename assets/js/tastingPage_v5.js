import { supabase } from "./supabaseClient.js";

function fmt1(x) {
  return (x === null || x === undefined || x === "")
    ? "—"
    : Number(x).toFixed(1);
}

function fmtCurrency(x) {
  return (x === null || x === undefined || x === "")
    ? "—"
    : `$${Number(x).toFixed(0)}`;
}

// Basic HTML escaping to avoid rendering issues / injection
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Read routing params from <html data-weight="..." data-dimension="...">
function getPageParams() {
  const root = document.documentElement;
  const weight = (root?.dataset?.weight || "").trim();
  const section = (root?.dataset?.dimension || "").trim(); // nose | palate | finish
  return { weight, section };
}

/**
 * GitHub Pages-safe barrel URL builder (assets folder)
 *
 * Your setup:
 * - GitHub Pages hosts under a repo subpath:
 *     https://<user>.github.io/<repo>/
 * - Your barrel page lives under:
 *     assets/barrel/index.html
 *
 * Why this is needed:
 * - Relative links from nested pages (e.g., /whiskey/cruiserweight/nose/index.html)
 *   would otherwise resolve to:
 *     /whiskey/cruiserweight/nose/assets/barrel/index.html   (wrong)
 * - GitHub Pages does NOT support rewrite rules for pretty URLs like /barrel/<id>.
 *
 * What we do:
 * - Compute the repo base path ("/<repo>/") when on *.github.io
 * - Build an absolute path *within the repo*:
 *     /<repo>/assets/barrel/index.html?id=<single_barrel_id>
 *
 * IMPORTANT:
 * - Folder casing matters on GitHub Pages. Ensure it is exactly "assets".
 */
function getGhPagesRepoBase() {
  const isGhPages = window.location.hostname.endsWith("github.io");
  if (!isGhPages) return "/";

  // Path looks like: /<repo>/whiskey/cruiserweight/nose/index.html
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.length ? `/${parts[0]}/` : "/";
}

function barrelUrl(singleBarrelId) {
  const id = encodeURIComponent(singleBarrelId ?? "");
  const base = getGhPagesRepoBase();
  return `${base}assets/barrel/index.html?id=${id}`;
}

/**
 * Simple modal (no external deps)
 * - openModal({ title, bodyHtml, footerHtml })
 * - closeModal()
 */
function ensureModalShell() {
  let modal = document.getElementById("tasting-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "tasting-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  modal.innerHTML = `
    <div class="tasting-modal__backdrop" data-modal-close
         style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;"></div>

    <div class="tasting-modal__panel"
         role="dialog" aria-modal="true" aria-label="Details"
         style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);
                width:min(920px,92vw);max-height:86vh;overflow:auto;
                background:#111;border:1px solid rgba(255,255,255,.12);
                border-radius:14px;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,.55);">
      <div class="tasting-modal__header"
           style="display:flex;gap:12px;align-items:center;justify-content:space-between;
                  padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.10);">
        <div>
          <div id="tasting-modal-title" style="font-weight:700;font-size:16px;color:#fff;"></div>
          <div id="tasting-modal-subtitle" style="font-size:12px;color:rgba(255,255,255,.72);margin-top:2px;"></div>
        </div>
        <button type="button" data-modal-close
                style="cursor:pointer;border:1px solid rgba(255,255,255,.18);
                       background:transparent;color:#fff;border-radius:10px;
                       padding:6px 10px;font-size:13px;">
          Close
        </button>
      </div>

      <div id="tasting-modal-body" style="padding:14px 16px;color:rgba(255,255,255,.9);"></div>

      <div id="tasting-modal-footer"
           style="padding:12px 16px;border-top:1px solid rgba(255,255,255,.10);
                  display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close behaviors
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.closest && t.closest("[data-modal-close]")) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  return modal;
}

function openModal({ title = "", subtitle = "", bodyHtml = "", footerHtml = "" }) {
  const modal = ensureModalShell();

  const titleEl = modal.querySelector("#tasting-modal-title");
  const subtitleEl = modal.querySelector("#tasting-modal-subtitle");
  const bodyEl = modal.querySelector("#tasting-modal-body");
  const footerEl = modal.querySelector("#tasting-modal-footer");

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;

  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("tasting-modal");
  if (!modal) return;
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

function showUnderConstructionModal(barrelHref, singleBarrelId) {
  openModal({
    title: "Under construction",
    subtitle: singleBarrelId ? `Barrel ID: ${singleBarrelId}` : "",
    bodyHtml: `
      <div style="line-height:1.5;">
        <p style="margin:0 0 10px 0;">
          This barrel detail page is not live yet.
        </p>
        <p style="margin:0;opacity:.85;">
          Route: <code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:8px;">${escapeHtml(
            barrelHref
          )}</code>
        </p>
      </div>
    `,
    footerHtml: `
      <a href="${escapeHtml(barrelHref)}"
         style="text-decoration:none;display:inline-block;
                border:1px solid rgba(255,255,255,.18);
                padding:8px 12px;border-radius:10px;color:#fff;">
        Open page
      </a>
      <button type="button" data-modal-close
              style="cursor:pointer;border:1px solid rgba(255,255,255,.18);
                     background:transparent;color:#fff;border-radius:10px;
                     padding:8px 12px;">
        Close
      </button>
    `,
  });
}

/**
 * Row-detail modal (uses already-loaded row data; NO supabase requery)
 */
function showRowDetailModal(rowEl) {
  if (!rowEl) return;

  const d = rowEl.dataset;

  const title = d.label ? d.label : "Tasting Details";
  const subtitle = d.batchBarrel ? `Batch / Barrel: ${d.batchBarrel}` : "";

  const bodyHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;">
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">Score</div>
        <div style="font-size:18px;font-weight:700;">${escapeHtml(d.scoreDisp || "—")}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">Proof</div>
        <div style="font-size:18px;font-weight:700;">${escapeHtml(d.proofDisp || "—")}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">Age</div>
        <div style="font-size:18px;font-weight:700;">${escapeHtml(d.ageDisp || "—")}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px;">
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">Expression</div>
        <div style="font-weight:600;">${escapeHtml(d.label || "—")}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">Release Type</div>
        <div style="font-weight:600;">${escapeHtml(d.releaseType || "—")}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">Batch / Barrel</div>
        <div style="font-weight:600;">${escapeHtml(d.batchBarrel || "—")}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
        <div style="font-size:12px;opacity:.7;margin-bottom:4px;">MSRP</div>
        <div style="font-weight:600;">${escapeHtml(d.msrpDisp || "—")}</div>
      </div>
    </div>

    <div style="padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;">
      <div style="font-size:12px;opacity:.7;margin-bottom:6px;">Notes</div>
      <div style="white-space:pre-wrap;line-height:1.5;">${escapeHtml(d.notes || "")}</div>
    </div>
  `;

  const barrelId = d.singleBarrelId || "";
  const barrelHref = barrelId ? barrelUrl(barrelId) : "#";

  const footerHtml = `
    <a href="${escapeHtml(barrelHref)}" data-expr-link="1"
       style="text-decoration:none;display:inline-block;
              border:1px solid rgba(255,255,255,.18);
              padding:8px 12px;border-radius:10px;color:#fff;">
      Go to barrel page
    </a>
    <button type="button" data-modal-close
            style="cursor:pointer;border:1px solid rgba(255,255,255,.18);
                   background:transparent;color:#fff;border-radius:10px;
                   padding:8px 12px;">
      Close
    </button>
  `;

  openModal({ title, subtitle, bodyHtml, footerHtml });
}

async function loadTastingSection() {
  const el = document.getElementById("tasting-content");
  if (!el) return;

  const { weight, section } = getPageParams();

  if (!weight || !section) {
    el.innerHTML = `
      <pre class="error">Missing page routing attributes.
Expected: &lt;html data-weight="heavyweight" data-dimension="finish"&gt;</pre>
    `;
    return;
  }

  const { data, error } = await supabase
    .from("v_tasting_sections")
    .select(
      "label,bottle_type,single_barrel_name,single_barrel_id,proof,age,msrp,notes,score"
    )
    .eq("weight_slug", weight)
    .eq("section", section)
    .order("score", { ascending: false, nullsFirst: false })
    .order("age", { ascending: false, nullsFirst: false })
    .order("proof", { ascending: false, nullsFirst: false })
    .order("label", { ascending: true });

  if (error) {
    el.innerHTML = `<pre class="error">${escapeHtml(error.message)}</pre>`;
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `
      <p class="muted">
        No tasting notes yet for ${escapeHtml(weight)} / ${escapeHtml(section)}.
      </p>`;
    return;
  }

  el.innerHTML = `
    <div class="table-wrap">
      <table class="tasting-table">
        <thead>
          <tr>
            <th class="num">Score</th>
            <th class="num">Age</th>
            <th class="num">Proof</th>
            <th>Expression</th>
            <th>Release Type</th>
            <th>Batch / Barrel</th>
            <th class="num">MSRP</th>
            <th class="notes">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map((r) => {
              const singleBarrelId = r.single_barrel_id ?? "";
              const barrelHref = singleBarrelId ? barrelUrl(singleBarrelId) : "#";

              // Pre-format display strings once, store on dataset for modal (no requery)
              const scoreDisp = fmt1(r.score);
              const proofDisp = fmt1(r.proof);
              const ageDisp = String(r.age ?? "—");
              const msrpDisp = fmtCurrency(r.msrp);

              return `
                <tr
                  data-single-barrel-id="${escapeHtml(singleBarrelId)}"
                  data-label="${escapeHtml(r.label)}"
                  data-release-type="${escapeHtml(r.bottle_type)}"
                  data-batch-barrel="${escapeHtml(r.single_barrel_name)}"
                  data-notes="${escapeHtml(r.notes ?? "")}"
                  data-score-disp="${escapeHtml(scoreDisp)}"
                  data-proof-disp="${escapeHtml(proofDisp)}"
                  data-age-disp="${escapeHtml(ageDisp)}"
                  data-msrp-disp="${escapeHtml(msrpDisp)}"
                  style="cursor:pointer;"
                >
                  <td class="num">${escapeHtml(scoreDisp)}</td>
                  <td class="num">${escapeHtml(ageDisp)}</td>
                  <td class="num">${escapeHtml(proofDisp)}</td>

                  <td>
                    <a
                      class="expr-link"
                      data-expr-link="1"
                      href="${escapeHtml(barrelHref)}"
                      style="color:inherit;text-decoration:underline;"
                      title="Open barrel details"
                    >
                      ${escapeHtml(r.label)}
                    </a>
                  </td>

                  <td>${escapeHtml(r.bottle_type)}</td>
                  <td>${escapeHtml(r.single_barrel_name)}</td>
                  <td class="num">${escapeHtml(msrpDisp)}</td>
                  <td class="notes">${escapeHtml(r.notes ?? "")}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  // Event delegation: one listener for the entire table body
  const tbody = el.querySelector("tbody");
  if (!tbody) return;

  tbody.addEventListener("click", (e) => {
    const target = e.target;

    // If Expression link clicked: update URL + show "under construction" popup
    const link =
      target && target.closest ? target.closest('a[data-expr-link="1"]') : null;
    if (link) {
      e.preventDefault();
      e.stopPropagation();

      const row = link.closest("tr");
      const barrelId = row?.dataset?.singleBarrelId || "";
      const href =
        link.getAttribute("href") || (barrelId ? barrelUrl(barrelId) : "#");

      // Update the URL in the address bar without navigating (SPA-style)
      // Note: With GitHub Pages, clean URLs like /barrel/<id> will 404 on refresh,
      // so we keep query-string URLs and only pushState to that safe URL.
      try {
        if (href && href !== "#") window.history.pushState({}, "", href);
      } catch (_) {
        // ignore history errors (rare / older browsers)
      }

      showUnderConstructionModal(href, barrelId);
      return;
    }

    // Otherwise, clicking anywhere in the row opens the details modal
    const row = target && target.closest ? target.closest("tr") : null;
    if (!row) return;

    showRowDetailModal(row);
  });

  // Handle back/forward navigation (optional nicety)
  window.addEventListener("popstate", () => {
    // For now we just close any open modal when navigating history
    closeModal();
  });
}

loadTastingSection();

/**
 * ==========================
 * Developer Notes (GitHub Pages)
 * ==========================
 *
 * Problem:
 * - GitHub Pages is static hosting and does NOT support rewrites like:
 *     /barrel/<uuid>  ->  /barrel/index.html
 * - Absolute paths (starting with "/") also break under repo subpaths:
 *     https://<user>.github.io/<repo>/
 *
 * Solution implemented:
 * 1) Build barrel links as query-string URLs:
 *      barrel/index.html?id=<uuid>
 *    This is a REAL file path, so it loads on GitHub Pages.
 *
 * 2) barrelUrl() uses document.baseURI to stay safe under subpaths:
 *      new URL("barrel/index.html?id=...", document.baseURI)
 *
 * Where links are used:
 * - Expression <a href="..."> now points to barrel/index.html?id=...
 * - The modal "Go to barrel page" button uses the same safe URL.
 * - The click handler fallback also uses barrelUrl().
 *
 * Later (optional):
 * - If you move off GitHub Pages to Netlify/Vercel, you can switch to pretty URLs
 *   (/barrel/<id>) by adding a rewrite rule and updating barrelUrl().
 */
