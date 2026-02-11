/* =========================================================
   Velvet Room — Skin2 Layout Injector
   File: assets/js/layout_skin2.js

   Purpose:
   - Inject a Skin2-only header/footer into:
       #site-header and #site-footer
   - Does NOT modify or depend on your existing layout.js
   - Safe to include only on index_skin2.html

   Notes:
   - Keeps markup minimal + "data-driven" look
   - If #site-header / #site-footer don't exist, it does nothing
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
