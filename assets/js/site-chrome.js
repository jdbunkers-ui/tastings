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
    document.body?.dataset?.page
      ? document.body.dataset.page.toLowerCase()
      : "";

  // ---------- Determine correct relative paths ----------
// Determine if we are at root level (e.g., /index.html)
   const path = window.location.pathname;
   
   const isSubfolder =
     path.includes("/inventory/") ||
     path.includes("/sensory/") ||
     path.includes("/distilleries/") ||
     path.includes("/bottles/") ||
     path.includes("/barrel_pickers/") ||
     path.includes("/comments/") ||
     path.includes("/about/") ||
     path.includes("/coterie/");   // ← ADD THIS
   
   const rootPrefix = isSubfolder ? "../" : "./";

  // ---------- Assets ----------
  const logoLeftSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter_text.png`;
  const logoRightSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter.png`;
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

// Reordered: Home, Inventory, Sensory, Coterie, About, Comments
const navHtml = `
  <nav class="skin2-nav-row hb-nav-row" aria-label="Primary navigation">
    ${navLink("Home", "index.html", "home")}
    ${navDivider()}
    ${navLink("Inventory", "inventory/index.html", "inventory")}
    ${navDivider()}
    ${navLink("Sensory", "sensory/index.html", "sensory")}
    ${navDivider()}
    ${navLink("Coterie", "coterie/index.html", "coterie")}
    ${navDivider()}
    ${navLink("About", "about/index.html", "about")}
    ${navDivider()}
    ${navLink("Comments", "comments/index.html", "comments")}
  </nav>
`;
  // ---------- Header ----------
  const headerHtml = `
    <style>
      .hb-header {
        position: relative;
        overflow: hidden;
        background: transparent !important;
      }

      .hb-header::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: url("${headerBgSrc}");
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 0;
      }

      .hb-header::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(
          to right,
          rgba(20, 12, 8, 0.65),
          rgba(20, 12, 8, 0.35),
          rgba(20, 12, 8, 0.65)
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
        gap: 6px;
      }

      .hb-tagline {
        font-size: 12px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.88);
        margin-left: 6px;
        white-space: nowrap;
        text-shadow: 0 1px 10px rgba(0,0,0,0.4);
      }

      .hb-nav-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .hb-nav-divider {
        opacity: 0.7;
        transform: translateY(1px);
      }

      .hb-nav-divider img {
        height: 14px;
        width: auto;
        display: block;
      }

      @media (max-width: 560px) {
        .hb-tagline { letter-spacing: 0.16em; }
        .hb-nav-divider { opacity: 0.5; }
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
          <img src="${logoLeftSrc}" alt="Honey Barrel Hunter" loading="lazy"
               style="height:125px; width:auto; display:block;" />
          <div class="hb-tagline">Blind Bourbon Tasting</div>
        </div>

        <img src="${logoRightSrc}" alt="Honey Barrel Hunter logo" loading="lazy"
             style="height:85px; width:auto; display:block;" />
      </div>
    </header>
    ${navHtml}
  `;

  // ---------- Footer ----------
  const footerHtml = `
    <footer class="skin2-footer" role="contentinfo">
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:6px;
        font-size:12px;
        opacity:0.85;
        text-align:center;
      ">
        <div>
          Designed & developed by <strong>Summitry Technology</strong>
        </div>
        <div>
          <a href="mailto:SummitryTechnology@gmail.com"
             style="color:inherit; text-decoration:none;">
            SummitryTechnology@gmail.com
          </a>
        </div>
      </div>
    </footer>
  `;

  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);
})();
