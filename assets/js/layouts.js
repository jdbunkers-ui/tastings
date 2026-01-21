function getBasePath() {
  // For GitHub Pages project sites: /<repo>/...
  const parts = window.location.pathname.split("/").filter(Boolean);

  if (window.location.hostname.endsWith("github.io") && parts.length > 0) {
    return `/${parts[0]}`;
  }
  return "";
}

async function loadPartial(elementId, url) {
  const el = document.getElementById(elementId);
  if (!el) return;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`layout.js: failed to load ${url} (${res.status})`);
      return;
    }
    el.innerHTML = await res.text();
  } catch (e) {
    console.error(`layout.js: error loading ${url}`, e);
  }
}

function wireNavLinks(base) {
  const routes = {
    home: `${base}/`,
    distilleries: `${base}/distilleries/`,
    bottles: `${base}/bottles/`,
    tastings: `${base}/tastings/`,
  };

  document.querySelectorAll("[data-nav]").forEach((a) => {
    const key = a.getAttribute("data-nav");
    if (routes[key]) a.setAttribute("href", routes[key]);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const base = getBasePath();

  await loadPartial("site-header", `${base}/partials/header.html`);
  await loadPartial("site-footer", `${base}/partials/footer.html`);

  // After header is injected, set correct links
  wireNavLinks(base);
});
