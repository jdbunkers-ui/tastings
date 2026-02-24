/* =========================================================
   Honey Barrel Hunter — Skin2 Inventory Filter
   File: assets/js/inventory-filter.js

   Adds:
   - Proof ≤ filter (#proofMax)
   - Stacks with existing search filter
   ========================================================= */

const elFilter = document.getElementById("filter");
const elProof = document.getElementById("proofMax");
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

function applyFilter() {
  const query = (elFilter?.value ?? "").trim().toLowerCase();
  const maxProofRaw = elProof?.value ?? "";
  const maxProof =
    maxProofRaw.trim() === "" ? null : parseFloat(maxProofRaw);

  const rows = getRows();
  if (!rows.length) return;

  for (const r of rows) {
    let show = true;

    // ---- Search Filter ----
    if (query) {
      const hay = (r.getAttribute("data-search") || "").toLowerCase();
      if (!hay.includes(query)) show = false;
    }

    // ---- Proof Filter ----
    if (show && maxProof !== null) {
      const proofAttr = r.getAttribute("data-proof");
      const proof = proofAttr == null ? null : parseFloat(proofAttr);

      if (proof == null || Number.isNaN(proof) || proof > maxProof) {
        show = false;
      }
    }

    r.style.display = show ? "" : "none";
  }

  const visible = countVisible(rows);
  const total = rows.length;

  if (!query && maxProof === null) {
    setStatus(`Loaded ${total} rows`);
  } else {
    let parts = [];
    if (query) parts.push(`search: "${elFilter.value}"`);
    if (maxProof !== null) parts.push(`proof ≤ ${maxProof}`);
    setStatus(`Showing ${visible} of ${total} (${parts.join(", ")})`);
  }
}

function debounce(fn, waitMs = 60) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

const onInput = debounce(applyFilter);

// Wire listeners
if (elFilter) {
  elFilter.addEventListener("input", onInput);
}

if (elProof) {
  elProof.addEventListener("input", onInput);
}

// Re-apply after table renders
window.addEventListener("skin2:inventoryRendered", () => {
  applyFilter();
});
