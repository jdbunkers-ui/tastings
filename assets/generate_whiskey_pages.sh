#!/usr/bin/env bash
set -euo pipefail

# ---------------------------
# Configuration
# ---------------------------
ROOT_DIR="whiskey"
WEIGHTS=(flyweight lightweight middleweight cruiserweight heavyweight)
DIMS=(nose palate finish)

# Choose which layout injector you actually use in your repo:
# If your repo uses assets/js/layout.js everywhere, set this to layout.js
# If your repo uses assets/js/layouts.js everywhere, set this to layouts.js
LAYOUT_JS_FILENAME="layout.js"

# Supabase view/table used by the reference implementation:
# Create this view later, or change to your real one.
SUPABASE_SOURCE_NAME="v_whiskey_compass_notes"

mkdir -p "assets/js"

# ---------------------------
# Create shared Supabase client module
# ---------------------------
cat > "assets/js/supabaseClient.js" <<'EOF'
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/**
 * IMPORTANT:
 * - Use your SUPABASE Project URL + anon key (safe to expose).
 * - Do NOT use the service_role key in browser code.
 */
export const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
export const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
EOF

# ---------------------------
# Create shared page logic module
# ---------------------------
cat > "assets/js/whiskeyCompassPage.js" <<EOF
import { supabase } from "./supabaseClient.js";

const SOURCE = "${SUPABASE_SOURCE_NAME}";

/**
 * Expected columns in SOURCE (view or table):
 * - weight_class (text)
 * - dimension (text)  -- 'nose' | 'palate' | 'finish'
 * - title (text)      -- optional
 * - note (text)       -- optional
 * - score (numeric)   -- optional
 * - created_at (timestamp) -- optional
 *
 * You can change these field names in renderRow() or query.
 */

function \$(id) { return document.getElementById(id); }

function titleCase(s) {
  return (s || "").replace(/\\b\\w/g, (c) => c.toUpperCase());
}

function buildPrevNext(weight, dim) {
  const order = ["nose", "palate", "finish"];
  const i = order.indexOf(dim);
  return {
    prev: i > 0 ? \`../\${order[i - 1]}/\` : null,
    next: i < order.length - 1 ? \`../\${order[i + 1]}/\` : null,
    weightIndex: \`../\` // useful if you later add whiskey/<weight>/index.html
  };
}

function setPrevNext(weight, dim) {
  const nav = buildPrevNext(weight, dim);

  const prevA = \$("nav-prev");
  const nextA = \$("nav-next");

  if (prevA) {
    if (nav.prev) {
      prevA.href = nav.prev;
      prevA.removeAttribute("aria-disabled");
      prevA.classList.remove("is-disabled");
    } else {
      prevA.href = "#";
      prevA.setAttribute("aria-disabled", "true");
      prevA.classList.add("is-disabled");
    }
  }

  if (nextA) {
    if (nav.next) {
      nextA.href = nav.next;
      nextA.removeAttribute("aria-disabled");
      nextA.classList.remove("is-disabled");
    } else {
      nextA.href = "#";
      nextA.setAttribute("aria-disabled", "true");
      nextA.classList.add("is-disabled");
    }
  }

  // Header text
  const hWeight = \$("page-weight");
  const hDim = \$("page-dimension");
  if (hWeight) hWeight.textContent = titleCase(weight);
  if (hDim) hDim.textContent = titleCase(dim);
}

function renderEmpty(container) {
  container.innerHTML = \`
    <div class="content-placeholder">
      <em>No tasting entries found.</em><br />
      <span>Add rows in Supabase for this weight + dimension.</span>
    </div>
  \`;
}

function renderError(container, message) {
  container.innerHTML = \`
    <div class="content-placeholder" style="border-color: rgba(255,80,80,0.6);">
      <strong style="color: rgba(255,140,140,0.95);">Error</strong><br />
      <span>\${message}</span>
    </div>
  \`;
}

function renderRow(row) {
  const title = row.title || "(Untitled)";
  const note = row.note || "";
  const score = (row.score ?? "").toString();
  const created = row.created_at ? new Date(row.created_at).toLocaleString() : "";

  return \`
    <article class="note-card">
      <div class="note-top">
        <div class="note-title">\${escapeHtml(title)}</div>
        \${score ? \`<div class="note-score">\${escapeHtml(score)}</div>\` : ""}
      </div>
      \${note ? \`<div class="note-body">\${escapeHtml(note)}</div>\` : ""}
      \${created ? \`<div class="note-meta">\${escapeHtml(created)}</div>\` : ""}
    </article>
  \`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadNotes(weight, dim) {
  const container = \$("notes");
  if (!container) return;

  container.innerHTML = \`
    <div class="content-placeholder">
      <em>Loading tasting entries…</em>
    </div>
  \`;

  try {
    // Reference query: filter by weight & dimension.
    // Update SOURCE/column names to match your schema.
    const { data, error } = await supabase
      .from(SOURCE)
      .select("weight_class, dimension, title, note, score, created_at")
      .eq("weight_class", weight)
      .eq("dimension", dim)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      renderError(container, error.message);
      return;
    }

    if (!data || data.length === 0) {
      renderEmpty(container);
      return;
    }

    container.innerHTML = data.map(renderRow).join("");
  } catch (e) {
    renderError(container, e?.message || "Unknown error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const weight = document.documentElement.getAttribute("data-weight") || "";
  const dim = document.documentElement.getAttribute("data-dimension") || "";

  setPrevNext(weight, dim);
  loadNotes(weight, dim);
});
EOF

# ---------------------------
# Create pages
# ---------------------------
for w in "${WEIGHTS[@]}"; do
  for d in "${DIMS[@]}"; do
    DIR="${ROOT_DIR}/${w}/${d}"
    mkdir -p "$DIR"

    # Relative path from whiskey/<weight>/<dim>/ to assets/ is ../../../assets/
    cat > "${DIR}/index.html" <<EOF
<!doctype html>
<html lang="en" data-weight="${w}" data-dimension="${d}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${w} – ${d} | The Velvet Slide</title>

    <!-- Shared site styles -->
    <link rel="stylesheet" href="../../../assets/css/site.css" />
  </head>

  <body>
    <!-- Injected Header -->
    <div id="site-header"></div>

    <main class="page-content">
      <section class="content-card">
        <header class="content-header">
          <h1 id="page-weight">${w}</h1>
          <h2 id="page-dimension">${d}</h2>
        </header>

        <nav class="page-nav">
          <a id="nav-prev" class="page-nav-btn" href="#" aria-disabled="true">← Prev</a>
          <a class="page-nav-btn" href="../../../index_v2.html">Home</a>
          <a id="nav-next" class="page-nav-btn" href="#" aria-disabled="true">Next →</a>
        </nav>

        <div class="content-description">
          <p>
            This page will display tasting notes for
            <strong>${w}</strong> whiskeys focused on <strong>${d}</strong>.
          </p>
        </div>

        <!-- Notes render here -->
        <div id="notes"></div>
      </section>
    </main>

    <!-- Injected Footer -->
    <div id="site-footer"></div>

    <!-- Layout injection -->
    <script src="../../../assets/js/${LAYOUT_JS_FILENAME}"></script>

    <!-- Supabase reference wiring -->
    <script type="module" src="../../../assets/js/whiskeyCompassPage.js"></script>
  </body>
</html>
EOF
  done
done

echo "✅ Generated 15 pages under ./${ROOT_DIR}/<weight>/<dimension>/index.html"
echo "✅ Created assets/js/supabaseClient.js and assets/js/whiskeyCompassPage.js"
echo ""
echo "NEXT:"
echo "1) Edit assets/js/supabaseClient.js with your SUPABASE_URL and SUPABASE_ANON_KEY"
echo "2) Ensure assets/js/${LAYOUT_JS_FILENAME} exists (layout.js OR layouts.js)"
echo "3) Commit + push"
