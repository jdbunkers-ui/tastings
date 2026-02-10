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

              const scoreDisp = fmt1(r.score);
              const proofDisp = fmt1(r.proof);
              const ageDisp = String(r.age ?? "—");
              const msrpDisp = fmtCurrency(r.msrp);

              return `
                <tr>
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

    // Expression link clicked: open in a NEW popup window every time
    const link =
      target && target.closest ? target.closest('a[data-expr-link="1"]') : null;

    if (link) {
      e.preventDefault();
      e.stopPropagation();

      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      // Always a NEW window (unique name each click)
      const windowName = `VelvetBarrelDetail_${Date.now()}`;

      const features = [
        "popup=yes",
        "noopener=yes",
        "noreferrer=yes",
        "width=980",
        "height=780",
        "left=140",
        "top=80",
        "scrollbars=yes",
        "resizable=yes",
      ].join(",");

      const w = window.open(href, windowName, features);
      if (w) w.focus();
      return;
    }

    // No row click behavior (all modals removed)
  });
}

loadTastingSection();

/**
 * ==========================
 * Developer Notes (GitHub Pages)
 * ==========================
 *
 * - Expression links point to:
 *     /assets/barrel/index.html?id=<uuid>
 * - Click opens in a NEW popup window each time (unique windowName).
 */
