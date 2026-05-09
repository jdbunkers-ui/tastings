import { supabase } from "../assets/js/supabaseClient.js";

const elQueue = document.getElementById("reviewQueue");
const elStatus = document.getElementById("status");
const elError = document.getElementById("error");

function setStatus(msg) {
  elStatus.textContent = msg;
}

function showError(message, details) {
  elError.style.display = "";
  elError.textContent = details ? `${message}\n\n${String(details)}` : message;
}

function clearError() {
  elError.style.display = "none";
  elError.textContent = "";
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(v) {
  const s = String(v ?? "").trim();
  return s ? escapeHtml(s) : "—";
}

function field(label, value) {
  return `
    <div>
      <div class="review-label">${escapeHtml(label)}</div>
      <div class="review-value">${display(value)}</div>
    </div>
  `;
}

function render(rows) {
  if (!rows.length) {
    elQueue.innerHTML = `<div class="review-card">No pending submissions.</div>`;
    return;
  }

  elQueue.innerHTML = rows
    .map((row) => {
      return `
        <article class="review-card" data-submission-id="${escapeHtml(row.submission_id)}">
          <h2>${display(row.brand_name)} ${display(row.expression_name)}</h2>
          <div class="review-muted">
            Submitted: ${display(row.create_ts)} • Status: ${display(row.submission_status)} / ${display(row.load_status)}
          </div>

          <h3 class="review-section-title">Submitter</h3>
          <div class="review-grid">
            ${field("Email", row.email_address)}
            ${field("Instagram", row.ig_account)}
            ${field("Submission ID", row.submission_id)}
            ${field("Submitted Bottle Type", row.submitted_bottle_type)}
          </div>

          <h3 class="review-section-title">Distillery</h3>
          <div class="review-grid">
            ${field("Existing Distillery ID", row.existing_distillery_id)}
            ${field("Distillery Name", row.distillery_name)}
            ${field("Country", row.distillery_country)}
            ${field("State", row.distillery_state)}
            ${field("City", row.distillery_city)}
            ${field("Address", row.distillery_address_line_1)}
            ${field("Postal Code", row.distillery_postal_code)}
            ${field("Notes", row.distillery_submitter_notes)}
          </div>

          <h3 class="review-section-title">Bottle</h3>
          <div class="review-grid">
            ${field("Existing Bottle ID", row.existing_bottle_id)}
            ${field("Brand", row.brand_name)}
            ${field("Expression", row.expression_name)}
            ${field("Category", row.spirit_category)}
            ${field("Subtype", row.spirit_subtype)}
            ${field("ABV", row.abv)}
            ${field("Size ML", row.size_ml)}
            ${field("MSRP", row.msrp)}
            ${field("Notes", row.bottle_submitter_notes)}
          </div>

          <h3 class="review-section-title">Single Barrel / Vintage</h3>
          <div class="review-grid">
            ${field("Detail Type", row.bottle_detail_type)}
            ${field("Pick Name / Batch", row.pick_name)}
            ${field("Bottling Year", row.bottling_year)}
            ${field("Batch Code", row.batch_code)}
            ${field("Warehouse", row.single_barrel_warehouse)}
            ${field("Cask Strength", row.cask_strength)}
            ${field("ABV Override", row.abv_override)}
            ${field("Age Months", row.age_statement_total_months)}
            ${field("Notes", row.single_barrel_submitter_notes)}
          </div>

          <h3 class="review-section-title">Barrel Picker</h3>
          <div class="review-grid">
            ${field("Existing Picker ID", row.existing_barrel_picker_id)}
            ${field("Picker Name", row.barrel_picker_name)}
            ${field("Picker Type", row.barrel_picker_type)}
            ${field("City", row.barrel_picker_city)}
            ${field("State", row.barrel_picker_state)}
            ${field("Instagram", row.instagram_url)}
            ${field("Website", row.website_url)}
            ${field("Notes", row.barrel_picker_submitter_notes)}
          </div>

          ${
            row.load_error_message
              ? `
                <h3 class="review-section-title">Load Error</h3>
                <div class="skin2-error">${escapeHtml(row.load_error_message)}</div>
              `
              : ""
          }

          <div class="review-actions">
            <button class="review-btn approve-btn" type="button" data-submission-id="${escapeHtml(row.submission_id)}">
              Approve + Load
            </button>

            <button class="review-btn review-btn-danger reject-btn" type="button" data-submission-id="${escapeHtml(row.submission_id)}">
              Reject
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  wireButtons();
}

async function loadQueue() {
  clearError();
  setStatus("Loading review queue…");

  const { data, error } = await supabase
    .from("v_bottle_review_queue")
    .select("*")
    .eq("is_approved_ind", false)
    .eq("is_rejected_ind", false)
    .order("create_ts", { ascending: false });

  if (error) {
    showError("Failed to load review queue.", error.message);
    setStatus("Error.");
    return;
  }

  render(data || []);
  setStatus(`${(data || []).length} pending submission(s).`);
}

function wireButtons() {
  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const submissionId = btn.getAttribute("data-submission-id");
      if (!submissionId) return;

      const ok = confirm("Approve and load this submission?");
      if (!ok) return;

      btn.disabled = true;
      setStatus("Approving submission…");

      const { error } = await supabase.rpc("f_admin_approve_bottle_submission", {
        p_submission_id: submissionId,
        p_approved_by: "Josh"
      });

      if (error) {
        showError("Approve failed.", error.message);
        btn.disabled = false;
        setStatus("Approve failed.");
        return;
      }

      await loadQueue();
    });
  });

  document.querySelectorAll(".reject-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const submissionId = btn.getAttribute("data-submission-id");
      if (!submissionId) return;

      const notes = prompt("Reject notes?");
      if (notes === null) return;

      btn.disabled = true;
      setStatus("Rejecting submission…");

      const { error } = await supabase.rpc("f_admin_reject_bottle_submission", {
        p_submission_id: submissionId,
        p_rejected_by: "Josh",
        p_review_notes: notes
      });

      if (error) {
        showError("Reject failed.", error.message);
        btn.disabled = false;
        setStatus("Reject failed.");
        return;
      }

      await loadQueue();
    });
  });
}

loadQueue();
