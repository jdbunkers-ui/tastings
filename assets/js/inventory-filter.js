/* =========================================================
   Velvet Room — Skin2 Inventory Filter (SAFE)
   File: assets/js/inventorySkin2Filter.js

   How it works:
   - Listens to #filter input
   - Filters rows with class ".inv-row"
   - Uses each row's data-search attribute (set by inventorySkin2Page.js)
   - Updates #status with visible counts

   Requires:
   - index_skin2.html has #filter and #status
   - inventorySkin2Page.js renders rows as:
       <tr class="inv-row" data-search="...">
   - inventorySkin2Page.js dispatches:
       window.dispatchEvent(new Event("skin2:inventoryRendered"));
   ========================================================= */

const elFilter = document.getElementById("filter");
const elStatus = document.getElementById("status");

function setStatus(text) {
  if (!elStatus) return;
  elStatus.textContent = text;
}

function getRows() {
  return Array.from(document.querySelectorAll("tr.inv-row"));
}

function countVisible(rows) {
  let n = 0;
  for (const r of rows) {
    if (r.style.display !== "none") n++;
  }
  return n;
}

function applyFilter(query) {
  const q = (query ?? "").trim().toLowerCase();
  const rows = getRows();

  // If table isn't rendered yet, just no-op
  if (!rows.length) return;

  // Filter
  if (!q) {
    for (const r of rows) r.style.display = "";
  } else {
    for (const r of rows) {
      const hay = (r.getAttribute("data-search") || "").toLowerCase();
      r.style.display = hay.includes(q) ? "" : "none";
    }
  }

  const visible = countVisible(rows);
  const total = rows.length;

  if (!q) {
    setStatus(`Loaded ${total} rows`);
  } else {
    setStatus(`Showing ${visible} of ${total} (filter: "${query}")`);
  }
}

function debounce(fn, waitMs = 60) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

const onInput = debounce(() => applyFilter(elFilter?.value ?? ""));

// Wire listeners
if (elFilter) {
  elFilter.addEventListener("input", onInput);
}

// Re-apply after table renders (SAFE: explicit event from inventorySkin2Page.js)
window.addEventListener("skin2:inventoryRendered", () => {
  applyFilter(elFilter?.value ?? "");
});
