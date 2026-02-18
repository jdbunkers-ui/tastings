// assets/js/ui/star.js

export function rotatingStarSVG({
  size = 18,
  className = "",
  style = ""
} = {}) {
  return `
    <svg
      class="star-icon ${className}"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style="width:${size}px; height:${size}px; vertical-align:middle; ${style}"
    >
      <path
        d="M12 2.2l2.9 6.2 6.8.6-5.2 4.5 1.6 6.7L12 16.9 5.9 20.2l1.6-6.7L2.3 9l6.8-.6L12 2.2z"
        fill="rgba(215, 162, 74, 0.95)"
        stroke="rgba(181, 122, 42, 0.85)"
        stroke-width="0.9"
      />
    </svg>
  `;
}
