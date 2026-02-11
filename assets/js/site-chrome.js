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

  const pageKey = (document.body && document.body.dataset && document.body.dataset.page
    ? document.body.dataset.page
    : "").toLowerCase();

  // ---------- Determine correct relative paths ----------
  const isRoot = !window.location.pathname.includes("/inventory/")
              && !window.location.pathname.includes("/distilleries/")
              && !window.location.pathname.includes("/bottles/")
              && !window.location.pathname.includes("/barrel_pickers/")
              && !window.location.pathname.includes("/about/");

  const rootPrefix = isRoot ? "./" : "../";

  // ---------- Logo path ----------
  const logoSrc = `${rootPrefix}assets/img/logo/honey_barrel_hunter.png`;

  // ---------- Page-specific subtitle / pills ----------
  let subtitle = "Honey Barrel Hunter";
  let pills = [];

  if (pageKey === "inventory") {
    subtitle = "inventory • data-driven view";
    pills = ["v_bottle_inventory"];
  } else if (pageKey === "distilleries") {
    subtitle = "distilleries • explore";
    pills = ["v_distillery"];
  } else if (pageKey === "bottles") {
    subtitle = "bottles • catalog";
    pills = ["bottles"];
  } else if (pageKey === "barrel_pickers") {
    subtitle = "barrel pickers • profiles";
    pills = ["barrel_pickers"];
  } else if (pageKey === "home") {
    subtitle = "home • Honey Barrel Hunter";
  } else if (pageKey === "about") {
    subtitle = "about • story & contact";
    pills = ["About"];
  }

  const pillsHtml = pills.length
    ? pills.map((p) => `<span class="skin2-pill">${p}</span>`).join("")
    : "";

  // ---------- Navigation ----------
  function navLink(label, target, key) {
    const active = pageKey === key ? "skin2-nav-active" : "";
    return `<a href="${rootPrefix}${target}" class="skin2-nav ${active}">${label}</a>`;
  }

  const navHtml = `
    <nav class="skin2-nav-row">
      ${navLink("Home", "index.html", "home")}
      ${navLink("Inventory", "inventory/index.html", "inventory")}
      ${navLink("About", "about/index.html", "about")}
    </nav>
  `;

  // ---------- Header ----------
  const headerHtml = `
    <header class="skin2-header" role="banner">
      <div>
        <h1>Honey Barrel Hunter</h1>
        <div class="subtitle">${subtitle}</div>
      </div>

      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; justify-content:flex-end;">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${pillsHtml}
        </div>

      <img
        src="${logoSrc}"
        alt="Honey Barrel Hunter logo"
        loading="lazy"
        style="height:148px; width:auto; display:block;"
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
