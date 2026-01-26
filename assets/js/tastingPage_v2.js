import { supabase } from "./supabaseClient.js";

function fmt1(x) {
  return (x === null || x === undefined || x === "")
    ? "—"
    : Number(x).toFixed(1);
}

function getRouteParams() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  // /whiskey/<weight>/<section>/
  return {
    weight: parts[parts.length - 2],
    section: parts[parts.length - 1],
  };
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

async function loadTastingSection() {
  const { weight, section } = getRouteParams();

  const { data, error } = await supabase
    .from("v_tasting_sections")
    .select("label,bottle_type,single_barrel_name,proof,age,notes,score")
    .eq("weight_slug", weight)
    .eq("section", section)
    .order("score", { ascending: false, nullsFirst: false })
    .order("age",   { ascending: false, nullsFirst: false })
    .order("proof", { ascending: false, nullsFirst: false })
    .order("label", { ascending: true });

  const el = document.getElementById("tasting-content");
  if (!el) return;

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
            <th>Label</th>
            <th>Bottle</th>
            <th>Single Barrel</th>
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
