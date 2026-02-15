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
    !window.location.pathname.includes("/about/");

  const rootPrefix = isRoot ? "./" : "../";

  // ---------- Logo paths ----------
  const logoRightSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter.png`;
  const logoLeftSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter_text.png`;

  // ---------- Navigation ----------
  function navLink(label, target, key) {
    const active = pageKey === key ? "skin2-nav-active" : "";
    return `<a href="${rootPrefix}${target}" class="skin2-nav ${active}">${label}</a>`;
  }

  const navHtml = `
    <nav class="skin2-nav-row">
      ${navLink("Home", "index.html", "home")}
      ${navLink("Inventory", "inventory/index.html", "inventory")}
      ${navLink("Sensory", "sensory/index.html", "sensory")}
      ${navLink("About", "about/index.html", "about")}
    </nav>
  `;

  // ---------- Header ----------
  const headerHtml = `
    <header class="skin2-header" role="banner">
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        width:100%;
      ">
        <img
          src="${logoLeftSrc}"
          alt="Honey Barrel Hunter"
          loading="lazy"
          style="height:125px; width:auto; display:block;"
        />

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
