/**
 * assets/js/comments-page.js
 * Handles:
 * - loading approved comments
 * - submitting new comments (pending approval)
 */

import { supabase } from "./supabaseClient.js";

// Change this if you want comments tied to a different page key
const PAGE_KEY = "comments";

// DOM refs
const form = document.getElementById("commentForm");
const nameInput = document.getElementById("name");
const commentInput = document.getElementById("comment");
const statusEl = document.getElementById("status");
const commentsEl = document.getElementById("comments");
const submitBtn = document.getElementById("submitBtn");

/* -------------------------------------------------------
   Utilities
------------------------------------------------------- */

function setStatus(message = "", type = "") {
  statusEl.className = "msg " + type;
  statusEl.textContent = message;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------
   Load approved comments
------------------------------------------------------- */

async function loadComments() {
  commentsEl.innerHTML = `<div class="meta">Loading…</div>`;

  const { data, error } = await supabase
    .from("comments")
    .select("name, comment, created_at")
    .eq("page", PAGE_KEY)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    commentsEl.innerHTML = `
      <div class="error">
        Failed to load comments: ${escapeHtml(error.message)}
      </div>`;
    return;
  }

  if (!data || data.length === 0) {
    commentsEl.innerHTML = `<div class="meta">No comments yet.</div>`;
    return;
  }

  commentsEl.innerHTML = data
    .map((row) => `
      <div class="card">
        <div class="meta">
          ${escapeHtml(row.name || "Anonymous")} •
          ${escapeHtml(formatDate(row.created_at))}
        </div>
        <div>
          ${escapeHtml(row.comment).replaceAll("\n", "<br>")}
        </div>
      </div>
    `)
    .join("");
}

/* -------------------------------------------------------
   Submit comment
------------------------------------------------------- */

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (!comment) {
    setStatus("Please enter a comment.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Submitting…");

  const { error } = await supabase
    .from("comments")
    .insert([{
      page: PAGE_KEY,
      name: name || null,
      comment
    }]);

  submitBtn.disabled = false;

  if (error) {
    setStatus(`Submit failed: ${error.message}`, "error");
    return;
  }

  form.reset();
  setStatus("Thanks! Your comment was submitted for approval.", "ok");

  // Reload approved comments (new one won't show until approved)
  loadComments();
});

/* -------------------------------------------------------
   Init
------------------------------------------------------- */

loadComments();
