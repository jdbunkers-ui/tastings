/* =========================================================
   Honey Barrel Hunter — Coterie Add (Popup)
   File: coterie/coterie-add.js
   ========================================================= */

import { supabase } from "../assets/js/supabaseClient.js";

// ---- Config ----
const INSERT_TABLE = "stg_coterie";

// ---- DOM ----
const form = document.getElementById("coterieForm");
const elMsg = document.getElementById("formMessage");

const elSingleBarrelId = document.getElementById("single_barrel_id");
const elName = document.getElementById("coterie_name");
const elIgAccount = document.getElementById("ig_account");
const elReviewDate = document.getElementById("review_date");
const elColor = document.getElementById("color");

const elNoseNotes = document.getElementById("nose_notes");
const elNoseScore = document.getElementById("nose_score");

const elPalateNotes = document.getElementById("palate_notes");
const elPalateScore = document.getElementById("palate_score");

const elFinishNotes = document.getElementById("finish_notes");
const elFinishScore = document.getElementById("finish_score");

const elSubmitBtn = form?.querySelector('button[type="submit"]');

// ---- Helpers ----
function setMessage(text, kind = "success") {
  if (!elMsg) return;

  elMsg.textContent = text ?? "";
  elMsg.className =
    kind === "error"
      ? "coterie-error"
      : "coterie-success";
}

function getTrimmed(el) {
  return (el?.value ?? "").toString().trim();
}

function numOrNull(el) {
  const raw = getTrimmed(el);

  if (raw === "") return null;

  const n = Number(raw);

  return Number.isFinite(n)
    ? n
    : null;
}

function normalizeIgAccount(value) {
  return (value || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function lockSingleBarrelId() {
  if (!elSingleBarrelId) return;

  // Backup: populate from query string if needed
  const params = new URLSearchParams(window.location.search);

  const fromQs =
    (params.get("single_barrel_id") || "").trim();

  if (!getTrimmed(elSingleBarrelId) && fromQs) {
    elSingleBarrelId.value = fromQs;
  }

  // Make non-editable but still submittable
  elSingleBarrelId.setAttribute("readonly", "true");
}

// ---- Boot ----
lockSingleBarrelId();

// ---- Submit ----
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setMessage("");

    const single_barrel_id =
      getTrimmed(elSingleBarrelId);

    const coterie_name =
      getTrimmed(elName);

    const ig_account =
      normalizeIgAccount(
        getTrimmed(elIgAccount)
      ) || null;

    const review_date =
      getTrimmed(elReviewDate);

    if (!single_barrel_id) {
      setMessage(
        "Missing single_barrel_id. Please close this window and click “Add Notes” from the Coterie table.",
        "error"
      );

      return;
    }

    if (!coterie_name) {
      setMessage(
        "Please enter your name.",
        "error"
      );

      elName?.focus();

      return;
    }

    if (!review_date) {
      setMessage(
        "Please select a review date.",
        "error"
      );

      elReviewDate?.focus();

      return;
    }

    // Validate scores
    const scores = [
      {
        el: elNoseScore,
        label: "Nose score"
      },
      {
        el: elPalateScore,
        label: "Palate score"
      },
      {
        el: elFinishScore,
        label: "Finish score"
      },
    ];

    for (const s of scores) {
      const raw = getTrimmed(s.el);

      if (raw === "") continue;

      const n = Number(raw);

      if (
        !Number.isFinite(n) ||
        n < 0 ||
        n > 10
      ) {
        setMessage(
          `${s.label} must be a number from 0 to 10.`,
          "error"
        );

        s.el?.focus();

        return;
      }
    }

    // Payload keys MUST match stg_coterie column names
    const payload = {
      single_barrel_id,
      coterie_name,
      ig_account,
      review_date,

      color:
        getTrimmed(elColor) || null,

      nose_notes:
        getTrimmed(elNoseNotes) || null,

      nose_score:
        numOrNull(elNoseScore),

      palate_notes:
        getTrimmed(elPalateNotes) || null,

      palate_score:
        numOrNull(elPalateScore),

      finish_notes:
        getTrimmed(elFinishNotes) || null,

      finish_score:
        numOrNull(elFinishScore),
    };

    // UI: disable submit while saving
    if (elSubmitBtn) {
      elSubmitBtn.disabled = true;
    }

    setMessage("Submitting…");

    try {
      const { error } =
        await supabase
          .from(INSERT_TABLE)
          .insert(payload);

      if (error) throw error;

      setMessage("Saved! Closing…");

      // Clear user-entered fields
      if (elName) elName.value = "";
      if (elIgAccount) elIgAccount.value = "";
      if (elReviewDate) elReviewDate.value = "";
      if (elColor) elColor.value = "";

      if (elNoseNotes) elNoseNotes.value = "";
      if (elNoseScore) elNoseScore.value = "";

      if (elPalateNotes) elPalateNotes.value = "";
      if (elPalateScore) elPalateScore.value = "";

      if (elFinishNotes) elFinishNotes.value = "";
      if (elFinishScore) elFinishScore.value = "";

      setTimeout(() => {
        try {
          window.close();
        } catch (_) {}
      }, 650);

    } catch (err) {

      const msg =
        err?.message ||
        (
          typeof err === "string"
            ? err
            : "Failed to submit to Coterie."
        );

      setMessage(msg, "error");

    } finally {

      if (elSubmitBtn) {
        elSubmitBtn.disabled = false;
      }
    }
  });
}
