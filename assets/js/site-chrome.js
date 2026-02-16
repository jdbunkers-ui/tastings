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

  // ---------- Header + nav assets ----------
  const headerBgSrc = `${rootPrefix}assets/img/logo/barrel_stacks.png`;
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

      .hb-header {
        position: relative;
        overflow: hidden;
        background: transparent !important;
      }

      /* Background image */
      .hb-header::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url("${headerBgSrc}");
        background-size: cover;
        background-repeat: no-repeat;
        background-position: center;
        transform: scale(1.02);
        z-index: 0;
      }

      /* Dark overlay for contrast */
      .hb-header::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to right,
          rgba(20, 12, 8, 0.60),
          rgba(20, 12, 8, 0.30),
          rgba(20, 12, 8, 0.60)
        );
        z-index: 1;
      }

      .hb-header-inner {
        position: relative;
        z-index: 2;
      }

      .hb-brand {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }

      .hb-tagline {
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.88);
        margin-left: 6px;
        white-space: nowrap;
        text-shadow: 0 1px 10px rgba(0,0,0,0.35);
      }

      /* Nav dividers */
      .hb-nav-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .hb-nav-divider {
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

      /* Footer extras */
      .hb-footer-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: center;
        font-size: 12px;
        opacity: 0.85;
        margin-top: 6px;
        text-align: center;
      }

      .hb-footer-links {
        display: inline-flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        align-items: center;
      }

      .hb-footer-links a {
        color: inherit;
        text-decoration: none;
        opacity: 0.95;
      }

      .hb-footer-links a:hover {
        text-decoration: underline;
      }

      .hb-dot {
        opacity: 0.6;
      }

      .hb-disclaimer {
        font-size: 11px;
        opacity: 0.75;
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

      <div class="hb-footer-meta">
        <div>Blind Bourbon Tasting</div>

        <div class="hb-footer-links">
          <a href="${rootPrefix}about/index.html">About</a>
          <span class="hb-dot">•</span>
          <a href="${rootPrefix}comments/index.html">Comments</a>
          <span class="hb-dot">•</span>
          <a href="mailto:HoneyBarrelHunter@gmail.com">honeybarrelhunter@gmail.com</a>
          <span class="hb-dot">•</span>
          <a href="https://venmo.com/honeybarrelhunter" target="_blank" rel="noopener">
            Buy me a pour
          </a>
          <span class="hb-dot">•</span>
          <span>${footerLabel}</span>
        </div>

        <div class="hb-disclaimer">
          Independent project. No paid placements.
        </div>
      </div>
    </footer>
  `;

  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);
})();
