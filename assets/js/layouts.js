// assets/js/layout.js
(async function () {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");

  // If these are null, the IDs don't match your HTML
  if (!headerEl || !footerEl) {
    console.error("[layout] Missing #site-header or #site-footer in the page.");
    return;
  }

  // Resolve correct base path for GitHub Pages project sites:
  // https://username.github.io/<repo>/...
  const isProjectPages = location.hostname.endsWith("github.io");
  const repoName = location.pathname.split("/")[1] || "";
  const base = isProjectPages ? `/${repoName}` : "";

  // Put your partials here (adjust folder names to your real structure)
  const headerUrl = `${base}/assets/partials/header.html`;
  const footerUrl = `${base}/assets/partials/footer.html`;

  console.log("[layout] base:", base);
  console.log("[layout] headerUrl:", headerUrl);
  console.log("[layout] footerUrl:", footerUrl);

  async function inject(url, el, label) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`${label} fetch failed: ${res.status} ${res.statusText} (${url})`);
    }
    const html = await res.text();
    if (!html.trim()) {
      console.warn(`[layout] ${label} loaded but was empty: ${url}`);
    }
    el.innerHTML = html;
  }

  try {
    await inject(headerUrl, headerEl, "header");
    await inject(footerUrl, footerEl, "footer");
    console.log("[layout] injected header + footer ✅");
  } catch (err) {
    console.error("[layout] ERROR:", err);
    // Optional: show a visible error on the page so you don't have to open devtools
    headerEl.innerHTML = `<div style="padding:12px;border:1px solid #c00;color:#c00;">
      Header failed to load. Open DevTools Console for details.
    </div>`;
  }
})();
