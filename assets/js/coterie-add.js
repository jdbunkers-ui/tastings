import { supabase } from "./supabaseClient.js";

const form = document.getElementById("coterieForm");
const message = document.getElementById("formMessage");

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

const singleBarrelId = getQueryParam("single_barrel_id");
document.getElementById("single_barrel_id").value = singleBarrelId ?? "";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  message.textContent = "";

  const payload = {
    single_barrel_id: singleBarrelId,
    coterie_name: document.getElementById("coterie_name").value,
    review_date: document.getElementById("review_date").value,
    color: document.getElementById("color").value,
    nose_notes: document.getElementById("nose_notes").value,
    nose_score: parseInt(document.getElementById("nose_score").value) || null,
    palate_notes: document.getElementById("palate_notes").value,
    palate_score: parseInt(document.getElementById("palate_score").value) || null,
    finish_notes: document.getElementById("finish_notes").value,
    finish_score: parseInt(document.getElementById("finish_score").value) || null
  };

  const { error } = await supabase
    .from("stg_coterie")
    .insert([payload]);

  if (error) {
    message.style.color = "red";
    message.textContent = "Submission failed. Please try again.";
    return;
  }

  message.style.color = "green";
  message.textContent = "Thank you. Your review has been submitted for approval.";

  form.reset();
  document.getElementById("single_barrel_id").value = singleBarrelId;
});
