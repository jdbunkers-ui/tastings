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

  const pageKey =
    document.body && document.body.dataset && document.body.dataset.page
      ? document.body.dataset.page.toLowerCase()
      : "";

  // ---------- Determine correct relative paths ----------
  const isRoot =
    !window.location.pathname.includes("/inventory/") &&
    !window.location.pathname.includes("/sensory/") &&
    !window.location.pathname.includes("/distilleries/") &&
    !window.location.pathname.includes("/bottles/") &&
    !window.location.pathname.includes("/barrel_pickers/") &&
    !window.location.pathname.includes("/comments/") &&
    !window.location.pathname.includes("/about/");

  const rootPrefix = isRoot ? "./" : "../";

  // ---------- Logo paths ----------
  const logoRightSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter.png`;
  const logoLeftSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter_text.png`;

  // ---------- New assets (you said you'll store these in assets/img/logo) ----------
  // Update filenames here if yours differ.
  const barrelTextureSrc = `${rootPrefix}assets/img/logo/barrel-rings.jpg`;
  const barrelDividerSrc = `${rootPrefix}assets/img/logo/barrel_divider.png`;

  // ---------- Navigation ----------
  function navLink(label, target, key) {
    const active = pageKey === key ? "skin2-nav-active" : "";
    return `<a href="${rootPrefix}${target}" class="skin2-nav ${active}">${label}</a>`;
  }

  function navDivider() {
    return `
      <span class="hb-nav-divider" aria-hidden="true">
        <img src="${barrelDividerSrc}" alt="" loading="lazy" />
      </span>
    `;
  }

  const navHtml = `
    <nav class="skin2-nav-row hb-nav-row" aria-label="Primary navigation">
      ${navLink("Home", "index.html", "home")}
      ${navDivider()}
      ${navLink("Inventory", "inventory/index.html", "inventory")}
      ${navDivider()}
      ${navLink("Sensory", "sensory/index.html", "sensory")}
      ${navDivider()}
      ${navLink("Comments", "comments/index.html", "comments")}
      ${navDivider()}
      ${navLink("About", "about/index.html", "about")}
    </nav>
  `;

  // ---------- Header ----------
  const headerHtml = `
    <style>
      /* --- Honey Barrel Hunter header enhancements (scoped) --- */

      /* Make header a stacking context for overlay */
      .hb-header {
        position: relative;
        overflow: hidden;
      }

      /* Subtle barrel texture overlay */
      .hb-header::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url("${barrelTextureSrc}");
        background-repeat: repeat;
        background-size: 900px auto;
        opacity: 0.08;              /* subtle */
        pointer-events: none;
        mix-blend-mode: multiply;   /* keeps it classy on light backgrounds */
        filter: saturate(0.9) contrast(0.95);
      }

      /* Keep header content above overlay */
      .hb-header-inner {
        position: relative;
        z-index: 1;
      }

      /* Left logo + tagline stack */
      .hb-brand {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        min-width: 0;
      }

      .hb-tagline {
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.80);
        margin-left: 6px;
        user-select: none;
        white-space: nowrap;
      }

      /* Nav barrel divider */
      .hb-nav-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .hb-nav-divider {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        opacity: 0.75;
        transform: translateY(1px);
      }

      .hb-nav-divider img {
        height: 14px;
        width: auto;
        display: block;
      }

      @media (max-width: 560px) {
        .hb-tagline { letter-spacing: 0.16em; }
        .hb-nav-divider { opacity: 0.55; }
      }
    </style>

    <header class="skin2-header hb-header" role="banner">
      <div class="hb-header-inner" style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        width:100%;
      ">
        <div class="hb-brand">
          <img
            src="${logoLeftSrc}"
            alt="Honey Barrel Hunter"
            loading="lazy"
            style="height:125px; width:auto; display:block;"
          />
          <div class="hb-tagline">Blind Bourbon Tasting</div>
        </div>

        <img
          src="${logoRightSrc}"
          alt="Honey Barrel Hunter logo"
          loading="lazy"
          style="height:85px; width:auto; display:block;"
        />
      </div>
    </header>
    ${navHtml}
  `;

  // ---------- Footer ----------
  const year = new Date().getFullYear();

  const footerLabel = pageKey
    ? pageKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Honey Barrel Hunter";

  const footerHtml = `
    <footer class="skin2-footer" role="contentinfo">
      <span>© ${year} Honey Barrel Hunter</span>
      <span>${footerLabel}</span>
    </footer>
  `;

  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);
})();
