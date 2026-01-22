function wireStubLinks() {
  document.querySelectorAll("a[data-stub]").forEach((a) => {
    const url = a.getAttribute("data-stub");
    if (url) a.setAttribute("href", url);
  });
}

function getBasePath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (window.location.hostname.endsWith("github.io") && parts.length > 0) {
    return `/${parts[0]}`; // repo name, e.g. /tastings
  }
  return "";
}

async function loadPartial(elementId, url) {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`[layout] Missing #${elementId}`);
    return;
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[layout] Failed to load ${url} (${res.status})`);
    return;
  }

  el.innerHTML = await res.text();
}

document.addEventListener("DOMContentLoaded", async () => {
  const base = getBasePath();

  await loadPartial("site-header", `${base}/assets/partials/header.html`);
  await loadPartial("site-footer", `${base}/assets/partials/footer.html`);
});
