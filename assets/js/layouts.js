// assets/js/layouts.js
(async function () {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");

  if (!headerEl || !footerEl) {
    console.error("[layout] Missing #site-header or #site-footer in the page.");
    return;
  }

  // GitHub Pages project site base: /<repo>
  const isGithubPages = location.hostname.endsWith("github.io");
  const repoName = location.pathname.split("/")[1] || "";
  const base = isGithubPages ? `/${repoName}` : "";

  const headerUrl = `${base}/assets/partials/header.html`;
  const footerUrl = `${base}/assets/partials/footer.html`;

  console.log("[layout] layouts.js loaded");
  console.log("[layout] headerUrl:", headerUrl);
  console.log("[layout] footerUrl:", footerUrl);

  async function inject(url, el, label) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${label} fetch failed: ${res.status} ${res.statusText} (${url})`);
    el.innerHTML = await res.text();
  }

  try {
    await inject(headerUrl, headerEl, "header");
    await inject(footerUrl, footerEl, "footer");
    console.log("[layout] injected header + footer ✅");
  } catch (err) {
    console.error("[layout] ERROR:", err);
    headerEl.innerHTML = `<div style="padding:12px;border:1px solid #c00;color:#c00;">
      Header failed to load. Check Console for details.
    </div>`;
  }
})();

  // After header is injected, set correct links
  wireNavLinks(base);
});
