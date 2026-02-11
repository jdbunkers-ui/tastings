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

  // ---------- Page-specific subtitle / pills ----------
  let subtitle = "Honey Barrel Hunter • Skin2";
  let pills = ["Skin2"];

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
    subtitle = "home • Honey Barrel Hunter";
    pills = ["Skin2"];
  } else if (pageKey === "about") {
    subtitle = "about • story & contact";
    pills = ["Skin2", "About"];
  }

  const pillsHtml = pills
    .map((p) => `<span class="skin2-pill">${p}</span>`)
    .join("");

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

      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        ${pillsHtml}
      </div>
    </header>
    ${navHtml}
  `;

  // ---------- Footer ----------
  const year = new Date().getFullYear();

  const footerLabel = pageKey
    ? pageKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Skin2";

  const footerHtml = `
    <footer class="skin2-footer" role="contentinfo">
      <span>© ${year} Honey Barrel Hunter</span>
      <span>${footerLabel}</span>
    </footer>
  `;

  inject(headerHost, headerHtml);
  inject(footerHost, footerHtml);
})();
