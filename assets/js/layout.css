// Base path for GitHub Pages vs custom domain
const BASE = location.hostname.includes("github.io") ? "/tastings" : "";

document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("site-header");
  const footer = document.getElementById("site-footer");

  if (header) {
    header.innerHTML = `
      <header class="site-header">
        <a href="${BASE}/index_v2.html">
          <img
            src="${BASE}/assets/img/velvetslide.png"
            alt="The Velvet Slide"
            class="site-logo"
          />
        </a>
      </header>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <footer class="site-footer">
        <p>© ${new Date().getFullYear()} The Velvet Slide</p>
      </footer>
    `;
  }
});
