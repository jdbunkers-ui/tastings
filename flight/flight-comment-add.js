import { supabase } from "../assets/js/supabaseClient.js";

const form = document.getElementById("flightCommentForm");
const elMsg = document.getElementById("formMessage");

const elFlightId = document.getElementById("flight_id");
const elName = document.getElementById("commenter_name");
const elIg = document.getElementById("ig_account");
const elComment = document.getElementById("comment_text");
const elSubmitBtn = form?.querySelector('button[type="submit"]');

function setMessage(text, kind = "success") {
  if (!elMsg) return;
  elMsg.textContent = text || "";
  elMsg.className =
    kind === "error"
      ? "flight-comment-error"
      : "flight-comment-success";
}

function getTrimmed(el) {
  return (el?.value || "").toString().trim();
}

(function boot() {
  const params = new URLSearchParams(window.location.search);
  const flightId = (params.get("flight_id") || "").trim();

  if (elFlightId) {
    elFlightId.value = flightId;
    elFlightId.setAttribute("readonly", "true");
  }

  if (!flightId) {
    setMessage(
      "Missing flight_id. Please close this window and click Add Comment from the Flight page.",
      "error"
    );
  }
})();

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMessage("");

    const flight_id = getTrimmed(elFlightId);
    const commenter_name = getTrimmed(elName);
    const ig_account = getTrimmed(elIg);
    const comment_text = getTrimmed(elComment);

    if (!flight_id) {
      setMessage("Missing flight_id.", "error");
      return;
    }

    if (!commenter_name) {
      setMessage("Please enter your name.", "error");
      elName?.focus();
      return;
    }

    if (!comment_text) {
      setMessage("Please enter a comment.", "error");
      elComment?.focus();
      return;
    }

    if (elSubmitBtn) elSubmitBtn.disabled = true;
    setMessage("Submitting…");

    try {
      const { error } = await supabase.rpc("f_submit_flight_comment", {
        p_flight_id: flight_id,
        p_commenter_name: commenter_name,
        p_ig_account: ig_account || null,
        p_comment_text: comment_text,
        p_created_ip_hash: null,
      });

      if (error) throw error;

      setMessage("Submitted! Your comment will appear after approval.");

      if (elName) elName.value = "";
      if (elIg) elIg.value = "";
      if (elComment) elComment.value = "";

      setTimeout(() => {
        try { window.close(); } catch (_) {}
      }, 900);
    } catch (err) {
      setMessage(err?.message || "Failed to submit comment.", "error");
    } finally {
      if (elSubmitBtn) elSubmitBtn.disabled = false;
    }
  });
}
