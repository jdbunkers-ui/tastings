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
    return false;
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    console.error(`[layout] Failed to load ${url} (${res.status})`);
    return false;
  }

  el.innerHTML = await res.text();
  return true;
}

function wireNavLinks(base) {
  const routes = {
    home: `${base}/`,
    distilleries: `${base}/distilleries/`,
    bottles: `${base}/bottles/`,
    tastings: `${base}/tastings/`,
  };

  document.querySelectorAll("a[data-nav]").forEach((a) => {
    const key = a.getAttribute("data-nav");
    if (routes[key]) a.setAttribute("href", routes[key]);
  });
}

function wireStubLinks() {
  document.querySelectorAll("a[data-stub]").forEach((a) => {
    const url = a.getAttribute("data-stub");
    if (url) a.setAttribute("href", url);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const base = getBasePath();

  const headerOk = await loadPartial("site-header", `${base}/assets/partials/header.html`);
  const footerOk = await loadPartial("site-footer", `${base}/assets/partials/footer.html`);

  // Only wire links after header is injected
  if (headerOk) {
    wireNavLinks(base);
    wireStubLinks();
  }

  if (!footerOk) {
    // footer failure is non-fatal; leave page usable
    console.warn("[layout] Footer did not load.");
  }
});
