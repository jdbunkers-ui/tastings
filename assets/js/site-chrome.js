/* =========================================================
   Site Chrome
   Injects shared header and footer used across all pages
   Page-aware via <body data-page="...">
   ========================================================= */

(function () {
  const headerHost = document.getElementById("site-header");
  const footerHost = document.getElementById("site-footer");

  function inject(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  const pageKey = (document.body?.dataset?.page || "").toLowerCase();

  // Defaults
  let subtitle = "Velvet Room • Skin2";
  let pills = ["Skin2"];

  // Per-page config
  if (pageKey === "inventory") {
    subtitle = "inventory • data-driven view";
    pills = ["Skin2", "v_bottle_inventory"];
  } else if (pageKey === "distilleries") {
    subtitle = "distilleries • explore";
    pills = ["Skin2", "v_distillery"];
  } else if (pageKey === "bottles") {
    subtitle = "bottles • catalog";
    pills = ["Skin2", "bottles"];
  } else if (pageKey === "barrel_pickers") {
    subtitle = "barrel pickers • profiles";
    pills = ["Skin2", "barrel_pickers"];
  } else if (pageKey === "home") {
    subtitle = "home • Velvet Room";
    pills = ["Skin2"];
  }

  const pillsHtml = pills
    .map((p) => `<span class="skin2-pill">${p}</span>`)
    .join("");

  const headerHtml = `
    <header class="skin2-header" role="banner">
      <div>
        <h1>Velvet Room</h1>
        <div class="subtitle">${subtitle}</div>
      </div>

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${pillsHtml}
      </div>
    </header>
  `;

  const year = new Date().getFullYear();
  const footerHtml = `
    <footer class="skin2-footer" role="contentinfo">
      <span>© ${year} Velvet Room</span>
      <span>${pageKey ? pageKey.replaceAll("_", " ") : "Skin2"}</span>
    </footer>
  `;

  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);
})();
