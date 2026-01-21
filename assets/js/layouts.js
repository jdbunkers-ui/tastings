async function loadPartial(elementId, filePath) {
  const container = document.getElementById(elementId);
  if (!container) return;

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.error(`Failed to load ${filePath}`);
      return;
    }
    container.innerHTML = await response.text();
  } catch (err) {
    console.error(`Error loading ${filePath}`, err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPartial("site-header", "/partials/header.html");
  loadPartial("site-footer", "/partials/footer.html");
});
