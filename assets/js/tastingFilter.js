/**
 * assets/js/tastingFilter.js
 *
 * Client-side filtering for tasting tables.
 *
 * ✅ Works with your current tastingPage.js table rendering
 * ✅ No re-querying Supabase; filters what's already on the page
 * ✅ "Zero duplication": every tasting page can include this same script
 *
 * Assumptions:
 * - Page contains:
 *   <input id="filter" ...>
 *   <span id="status"></span>   (optional, but recommended)
 *   <div id="error"></div>      (optional)
 * - Table rendered by tastingPage.js uses:
 *   <table class="tasting-table"> ... <tbody> ... </tbody>
 */

(function initTastingFilter() {
  // ------------------------------------------------------------
  // 1) Grab the UI controls (if they exist on the page)
  // ------------------------------------------------------------
  const filterEl = document.getElementById("filter"); // text input users type into
  const statusEl = document.getElementById("status"); // small status text like "Rows: 42"
  const errorEl = document.getElementById("error");   // area to show errors (optional)

  // If the page doesn't include a filter input, exit quietly.
  // This lets you reuse the script even on pages that don't have filter UI yet.
  if (!filterEl) return;

  // ------------------------------------------------------------
  // 2) Helper: count how many rows are currently visible
  // ------------------------------------------------------------
  function countVisibleRows(rows) {
    let n = 0;
    rows.forEach((tr) => {
      // We treat rows hidden via display:none as filtered out
      if (tr.style.display !== "none") n += 1;
    });
    return n;
  }

  // ------------------------------------------------------------
  // 3) Apply filter by hiding/showing table rows
  //    - This is fast and doesn't require re-rendering the table.
  // ------------------------------------------------------------
  function applyFilter() {
    try {
      if (errorEl) errorEl.textContent = "";

      // Find the current tasting table and its body rows
      const table = document.querySelector("table.tasting-table");
      const tbody = table?.querySelector("tbody");
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : [];

      // If the table isn't on the page yet, show a helpful status and retry later.
      // (This can happen if tastingPage.js is still loading data.)
      if (!table || !tbody) {
        if (statusEl) statusEl.textContent = "Loading…";
        return;
      }

      // Normalize the user's query (lowercase, trimmed)
      const q = filterEl.value.trim().toLowerCase();

      // If the query is empty, show all rows
      if (!q) {
        rows.forEach((tr) => (tr.style.display = ""));
        if (statusEl) statusEl.textContent = `Rows: ${rows.length}`;
        return;
      }

      // Otherwise, for each row:
      // - build a single searchable string from its visible text
      // - show the row if it contains the query
      rows.forEach((tr) => {
        const text = tr.textContent?.toLowerCase() ?? "";
        tr.style.display = text.includes(q) ? "" : "none";
      });

      const visible = countVisibleRows(rows);

      // Update status with filtered counts
      if (statusEl) statusEl.textContent = `Rows: ${visible} (filtered from ${rows.length})`;
    } catch (e) {
      // If anything goes wrong, surface a readable message
      if (errorEl) errorEl.textContent = `Filter error:\n${String(e?.message ?? e)}`;
      if (statusEl) statusEl.textContent = "Filter failed";
    }
  }

  // ------------------------------------------------------------
  // 4) Listen for typing in the filter input (live filtering)
  // ------------------------------------------------------------
  filterEl.addEventListener("input", applyFilter);

  // ------------------------------------------------------------
  // 5) Run once on startup
  //    - Sometimes the table is not yet rendered when this script runs.
  //    - We'll run immediately and also re-run after a short delay.
  // ------------------------------------------------------------
  applyFilter();
  setTimeout(applyFilter, 300);
  setTimeout(applyFilter, 800);
})();
