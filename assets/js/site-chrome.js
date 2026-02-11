/* =========================================================
// Site Chrome
// Injects shared header and footer used across all pages
   ========================================================= */

(function () {
  const headerHost = document.getElementById("site-header");
  const footerHost = document.getElementById("site-footer");

  // Helper: safe inject
  function inject(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  // Build header (Skin2)
  const headerHtml = `
    <header class="skin2-header" role="banner">
      <div>
        <h1>Velvet Room</h1>
        <div class="subtitle">inventory • data-driven view</div>
      </div>

      <div style="display:flex; gap:8px; align-items:center;">
        <span class="skin2-pill">Skin2</span>
        <span class="skin2-pill">v_bottle_inventory</span>
      </div>
    </header>
  `;

  // Build footer (Skin2)
  const year = new Date().getFullYear();
  const footerHtml = `
    <footer class="skin2-footer" role="contentinfo">
      <span>© ${year} Velvet Room</span>
      <span>Skin2 • inventory</span>
    </footer>
  `;

  // Inject
  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);
})();
