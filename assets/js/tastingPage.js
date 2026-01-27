import { supabase } from "./supabaseClient.js";

function fmt1(x) {
  return (x === null || x === undefined || x === "")
    ? "—"
    : Number(x).toFixed(1);
}

// Basic HTML escaping to avoid rendering issues
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
  const section = (root?.dataset?.dimension || "").trim(); // dimension == nose|palate|finish
  return { weight, section };
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
    .select("label,bottle_type,single_barrel_name,proof,age,notes,score")
    .eq("weight_slug", weight)
    .eq("section", section)
    .order("score", { ascending: false, nullsFirst: false })
    .order("age",   { ascending: false, nullsFirst: false })
    .order("proof", { ascending: false, nullsFirst: false })
    .order("label", { ascending: true });

  if (error) {
    el.innerHTML = `<pre class="error">${escapeHtml(error.message)}</pre>`;
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p class="muted">No tasting notes yet for ${escapeHtml(
      weight
    )} / ${escapeHtml(section)}.</p>`;
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
            <th class="notes">Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (r) => `
            <tr>
              <td class="num">${fmt1(r.score)}</td>
              <td class="num">${escapeHtml(r.age ?? "—")}</td>
              <td class="num">${fmt1(r.proof)}</td>
              <td>${escapeHtml(r.label)}</td>
              <td>${escapeHtml(r.bottle_type)}</td>
              <td>${escapeHtml(r.single_barrel_name)}</td>
              <td class="notes">${escapeHtml(r.notes ?? "")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

loadTastingSection();
