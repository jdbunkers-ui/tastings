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

  // ---------- New UI assets ----------
  // You need to add these two images to your project:
  // - assets/img/ui/barrel-rings.png (subtle transparent texture)
  // - assets/img/ui/barrel-divider.png (tiny barrel icon)
  const barrelRingsSrc = `${rootPrefix}assets/img/ui/barrel-rings.png`;
  const barrelDividerSrc = `${rootPrefix}assets/img/ui/barrel-divider.png`;

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
      .hb-header {
        position: relative;
        overflow: hidden;
      }

      /* Subtle barrel ring texture overlay */
      .hb-header::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url("${barrelRingsSrc}");
        background-repeat: repeat;
        background-size: 520px auto;
        opacity: 0.10;           /* keep it subtle */
        pointer-events: none;
        mix-blend-mode: multiply; /* gentle on light backgrounds */
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
        color: rgba(255,255,255,0.78);
        margin-left: 6px;
        user-select: none;
        white-space: nowrap;
      }

      /* If your header background is light on any page, this keeps it readable */
      @media (prefers-contrast: more) {
        .hb-tagline { color: rgba(255,255,255,0.92); }
        .hb-header::after { opacity: 0.14; }
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

      /* Slightly reduce divider visibility on small screens */
      @media (max-width: 560px) {
        .hb-nav-divider { opacity: 0.55; }
        .hb-tagline { letter-spacing: 0.16em; }
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
