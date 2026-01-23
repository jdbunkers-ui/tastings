import { supabase } from "./supabaseClient.js";

function getRouteParams() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  // /whiskey/<weight>/<section>/
  return {
    weight: parts[parts.length - 2],
    section: parts[parts.length - 1],
  };
}

async function loadTastingSection() {
  const { weight, section } = getRouteParams();

  const { data, error } = await supabase
    .from("v_tasting_sections")
    .select("label,bottle_type,single_barrel_name,proof,age,notes,score")
    .eq("weight_slug", weight)
    .eq("section", section)
    .order("label", { ascending: true });

  const el = document.getElementById("tasting-content");
  if (!el) return;

  if (error) {
    el.innerHTML = `<pre class="error">${error.message}</pre>`;
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p class="muted">No tasting notes yet for ${weight} / ${section}.</p>`;
    return;
  }

  el.innerHTML = data.map(r => `
    <div class="card">
      <div class="title">${r.label} — ${r.bottle_type}</div>
      <div class="meta">
        Single Barrel: ${r.single_barrel_name}
        • Proof: ${r.proof ?? "—"}
        • Age: ${r.age ?? "—"}
      </div>
      <div class="notes">${r.notes ?? ""}</div>
      <div class="meta">Score: ${r.score ?? "—"}</div>
    </div>
  `).join("");
}

loadTastingSection();