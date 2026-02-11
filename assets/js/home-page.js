import { supabase } from "./supabaseClient.js";

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -----------------------
   Journal (top section)
------------------------ */
async function loadJournal() {
  const mount = el("journalMount");
  const hint = el("journalHint");
  if (!mount) return;

  hint.textContent = "Loading…";

  // Pull all records from the view
  // NOTE: view currently LIMIT 6. If you truly want ALL, remove LIMIT from the view.
  const { data, error } = await supabase
    .from("v_journal")
    .select("journal_id, change_notes, create_date, new_update")
    .order("create_date", { ascending: false });

  if (error) {
    hint.textContent = "Failed to load.";
    mount.innerHTML = `<div class="skin2-error">Journal error: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const rows = data ?? [];
  hint.textContent = rows.length ? `${rows.length} updates` : "No updates yet.";

  const table = `
    <div class="skin2-card" style="padding:12px;">
      <div class="hb-table-wrap">
        <table class="hb-table">
          <thead>
            <tr>
              <th style="width:120px;">Date</th>
              <th>Update</th>
              <th style="width:110px;">New</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="mono">${escapeHtml(r.create_date)}</td>
                <td>${escapeHtml(r.change_notes)}</td>
                <td>
                  ${r.new_update ? `<span class="hb-badge hb-badge--new">NEW</span>` : ``}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  mount.innerHTML = table;
}

/* --------------------------------
   Barrel Pickers (bottom section)
   Requirements:
   - same format as top section (table)
   - retain hyperlinks
   - keep State group in-line (not a header row)
   - sort by State ASC
--------------------------------- */
async function loadBarrelPickers() {
  const mount = el("pickerMount");
  const hint = el("pickerHint");
  if (!mount) return;

  hint.textContent = "Loading…";

  // Assumption: you already have a view/table powering barrel pickers
  // Replace "v_barrel_pickers" + fields with your actual source.
  const { data, error } = await supabase
    .from("v_barrel_pickers")
    .select("barrel_picker_id, barrel_picker_name, state, barrels_count")
    .order("state", { ascending: true })
    .order("barrel_picker_name", { ascending: true });

  if (error) {
    hint.textContent = "Failed to load.";
    mount.innerHTML = `<div class="skin2-error">Barrel pickers error: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const rows = data ?? [];
  hint.textContent = rows.length ? `${rows.length} pickers` : "No pickers found.";

  // "retain hyperlinks" — assuming the picker profile page lives at /barrel_pickers/index.html?id=...
  // If your link format differs, change href builder below.
  const linkForPicker = (id) => `./barrel_pickers/index.html?barrel_picker_id=${encodeURIComponent(id)}`;

  const table = `
    <div class="skin2-card" style="padding:12px;">
      <div class="hb-table-wrap">
        <table class="hb-table">
          <thead>
            <tr>
              <th>Picker</th>
              <th style="width:120px;">State</th>
              <th style="width:120px;">Barrels</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>
                  <a class="skin2-link" href="${linkForPicker(r.barrel_picker_id)}">
                    ${escapeHtml(r.barrel_picker_name)}
                  </a>
                </td>
                <td class="mono">${escapeHtml(r.state)}</td>
                <td class="mono" style="text-align:right;">${escapeHtml(r.barrels_count ?? "")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  mount.innerHTML = table;
}

(async function init() {
  await loadJournal();
  await loadBarrelPickers();
})();
