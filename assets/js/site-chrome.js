/* =========================================================
   Site Chrome (Bulletproof Root-Based Navigation + GA4)
   Injects shared header and footer across all pages
   Page-aware via <body data-page="...">
   ========================================================= */

(function () {
  const GA_MEASUREMENT_ID = "G-WYKYH1KKXY";

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

  // -------------------------------------------------------
  // Absolute root prefix (no folder guessing ever again)
  // -------------------------------------------------------
  const seg1 = (window.location.pathname.split("/")[1] || "").trim();
  const ROOT =
    window.location.hostname.endsWith("github.io") && seg1
      ? `/${seg1}/`
      : "/";

  // ---------- Assets ----------
  const logoLeftSrc = `${ROOT}assets/img/logo/honey_barrel_hunter_text.png`;
  const logoRightSrc = `${ROOT}assets/img/logo/honey_barrel_hunter.png`;
  const headerBgSrc = `${ROOT}assets/img/logo/barrel_stacks.png`;
  const barrelDividerSrc = `${ROOT}assets/img/logo/barrel_divider.png`;

  // -------------------------------------------------------
  // Analytics helper
  // -------------------------------------------------------
  function analyticsReady() {
    return typeof window.gtag === "function";
  }

  function sanitizeValue(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  window.HBHAnalytics = window.HBHAnalytics || {
    measurementId: GA_MEASUREMENT_ID,

    pageView(pageTitle, pagePath, pageLocation, extraParams = {}) {
      if (!analyticsReady()) return;

      window.gtag("event", "page_view", {
        page_title: sanitizeValue(pageTitle || document.title),
        page_path: sanitizeValue(pagePath || window.location.pathname),
        page_location: sanitizeValue(pageLocation || window.location.href),
        page_key: sanitizeValue(pageKey || "unknown"),
        ...extraParams
      });
    },

    event(eventName, params = {}) {
      if (!analyticsReady() || !eventName) return;

      window.gtag("event", sanitizeValue(eventName), {
        page_key: sanitizeValue(pageKey || "unknown"),
        page_title: sanitizeValue(document.title),
        page_path: sanitizeValue(window.location.pathname),
        ...params
      });
    }
  };

  // ---------- Navigation ----------
  function navLink(label, target, key) {
    const active = pageKey === key ? "skin2-nav-active" : "";
    const href = `${ROOT}${target}`;

    return `
      <a
        href="${href}"
        class="skin2-nav ${active}"
        data-analytics="nav-link"
        data-nav-label="${label}"
        data-nav-key="${key}"
        data-nav-target="${target}"
      >
        ${label}
      </a>
    `;
  }

  function navDivider() {
    return `
      <span class="hb-nav-divider" aria-hidden="true">
        <img src="${barrelDividerSrc}" alt="" loading="lazy" />
      </span>
    `;
  }

  // Navigation order:
  // Home Flight Inventory Coterie Pickers Sensory FAQ About Comments
  const navHtml = `
    <nav class="skin2-nav-row hb-nav-row" aria-label="Primary navigation">
      ${navLink("Home", "index.html", "home")}
      ${navDivider()}
      ${navLink("Flight", "flight/index.html", "flight")}
      ${navDivider()}
      ${navLink("Inventory", "inventory/index.html", "inventory")}
      ${navDivider()}
      ${navLink("Coterie", "coterie/index.html", "coterie")}
      ${navDivider()}
      ${navLink("Pickers", "pickers/index.html", "pickers")}
      ${navDivider()}
      ${navLink("Sensory", "sensory/index.html", "sensory")}
      ${navDivider()}
      ${navLink("FAQ", "faqs/index.html", "faqs")}
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
          Designed & developed by <strong>White Blaze Analytics LLC</strong>
        </div>
        <div>
          <a
            href="mailto:whiteblazeanalytics@gmail.com"
            style="color:inherit; text-decoration:none;"
          >
            whiteblazeanalytics@gmail.com
          </a>
        </div>
      </div>
    </footer>
  `;

  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);

  // -------------------------------------------------------
  // Automatic analytics
  // -------------------------------------------------------

  // Track initial page view after shared chrome is injected.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.HBHAnalytics.pageView();
    });
  } else {
    window.HBHAnalytics.pageView();
  }

  // Track clicks on top navigation.
  document.addEventListener("click", function (e) {
    const navEl = e.target.closest('[data-analytics="nav-link"]');
    if (!navEl) return;

    window.HBHAnalytics.event("navigation_click", {
      nav_label: sanitizeValue(navEl.dataset.navLabel),
      nav_key: sanitizeValue(navEl.dataset.navKey),
      nav_target: sanitizeValue(navEl.dataset.navTarget),
      destination_url: sanitizeValue(navEl.href)
    });
  });

  // Track single barrel / bottle clicks across pages.
  document.addEventListener("click", function (e) {
    const bottleEl = e.target.closest('[data-analytics="single-barrel-click"]');
    if (!bottleEl) return;

    window.HBHAnalytics.event("single_barrel_click", {
      single_barrel_id: sanitizeValue(bottleEl.dataset.singleBarrelId),
      bottle_name: sanitizeValue(bottleEl.dataset.bottleName),
      destination_url: sanitizeValue(bottleEl.href)
    });
  });

  // Track barrel picker clicks across pages.
  document.addEventListener("click", function (e) {
    const pickerEl = e.target.closest('[data-analytics="barrel-picker-click"]');
    if (!pickerEl) return;

    window.HBHAnalytics.event("barrel_picker_click", {
      barrel_picker_id: sanitizeValue(pickerEl.dataset.barrelPickerId),
      barrel_picker_name: sanitizeValue(pickerEl.dataset.barrelPickerName),
      source_bottle_id: sanitizeValue(pickerEl.dataset.sourceBottleId),
      destination_url: sanitizeValue(pickerEl.href)
    });
  });

  // Optional helper for future custom link tracking anywhere on the site.
  // Usage:
  // <a
  //   href="https://example.com"
  //   data-analytics="custom-link"
  //   data-event-name="distillery_click"
  //   data-link-label="Milk Street Distillery"
  // >
  //   Visit Distillery
  // </a>
  document.addEventListener("click", function (e) {
    const linkEl = e.target.closest('[data-analytics="custom-link"]');
    if (!linkEl) return;

    const eventName = sanitizeValue(linkEl.dataset.eventName || "custom_link_click");

    window.HBHAnalytics.event(eventName, {
      link_label: sanitizeValue(linkEl.dataset.linkLabel || linkEl.textContent),
      destination_url: sanitizeValue(linkEl.href),
      link_text: sanitizeValue(linkEl.textContent)
    });
  });
})();
