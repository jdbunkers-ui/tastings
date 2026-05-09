import { supabase } from "../assets/js/supabaseClient.js";

const el = (id) => document.getElementById(id);

function setStatus(msg) {
  el("status").textContent = msg;
}

function val(id) {
  return (el(id)?.value || "").trim();
}

function numOrNull(id) {
  const raw = val(id);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function must(label, promise) {
  const { data, error } = await promise;
  if (error) {
    console.error(label, error);
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

async function loadDropdowns() {
  const distilleries = await must(
    "Load distilleries",
    supabase.from("v_coterie_distillery_options").select("*")
  );

  el("distillerySelect").innerHTML =
    `<option value="">Select Distillery</option>` +
    (distilleries || [])
      .map((d) => `<option value="${d.distillery_id}">${d.distillery_name}</option>`)
      .join("");

  const bottles = await must(
    "Load bottles",
    supabase.from("v_coterie_bottle_options").select("*")
  );

  el("bottleSelect").innerHTML =
    `<option value="">Select Bottle</option>` +
    (bottles || [])
      .map((b) => `<option value="${b.bottle_id}">${b.bottle_display_name}</option>`)
      .join("");

  const pickers = await must(
    "Load barrel pickers",
    supabase.from("v_coterie_barrel_picker_options").select("*")
  );

  el("pickerSelect").innerHTML =
    `<option value="">Select Picker</option>` +
    (pickers || [])
      .map((p) => `<option value="${p.barrel_picker_id}">${p.barrel_picker_name}</option>`)
      .join("");
}

function wireUI() {
  el("addDistilleryBtn").onclick = () => {
    el("distilleryForm").style.display = "block";
    el("distillerySelect").value = "";
  };

  el("addBottleBtn").onclick = () => {
    el("bottleForm").style.display = "block";
    el("bottleSelect").value = "";
  };

  el("addPickerBtn").onclick = () => {
    el("pickerForm").style.display = "block";
    el("pickerSelect").value = "";
  };

  el("barrelType").onchange = () => {
    el("singleBarrelForm").style.display =
      el("barrelType").value ? "block" : "none";
  };

  el("submitBtn").onclick = submit;
}

async function submit() {
  try {
    setStatus("Submitting…");

    const email = val("email");
    const ig = val("ig") || null;

    if (!email) {
      throw new Error("Email is required.");
    }

    const existingDistilleryId = val("distillerySelect") || null;
    const existingBottleId = val("bottleSelect") || null;
    const existingPickerId = val("pickerSelect") || null;
    const barrelType = val("barrelType");

    const submission = await must(
      "Create parent submission",
      supabase
        .from("stg_bottle_load_submission")
        .insert({
          email_address: email,
          ig_account: ig,
          existing_distillery_id: existingDistilleryId,
          existing_bottle_id: existingBottleId,
          existing_barrel_picker_id: existingPickerId,
          submitted_bottle_type: barrelType || null
        })
        .select("submission_id")
        .single()
    );

    const submission_id = submission.submission_id;

    await must(
      "Create distillery submission",
      supabase.from("stg_distillery_submission").insert({
        submission_id,
        existing_distillery_id: existingDistilleryId,
        distillery_name: val("distillery_name") || null,
        country: val("country") || null,
        state: val("state") || null,
        address_line_1: val("address_line_1") || null,
        city: val("city") || null,
        postal_code: val("postal_code") || null,
        email_address: email,
        ig_account: ig
      })
    );

    await must(
      "Create bottle submission",
      supabase.from("stg_bottle_submission").insert({
        submission_id,
        existing_bottle_id: existingBottleId,
        existing_distillery_id: existingDistilleryId,
        brand_name: val("brand_name") || null,
        expression_name: val("expression_name") || null,
        spirit_category: val("spirit_category") || null,
        abv: numOrNull("abv"),
        size_ml: numOrNull("size_ml"),
        email_address: email,
        ig_account: ig
      })
    );

    if (barrelType) {
      await must(
        "Create single barrel / vintage submission",
        supabase.from("stg_single_barrel_submission").insert({
          submission_id,
          existing_bottle_id: existingBottleId,
          existing_barrel_picker_id: existingPickerId,
          bottle_detail_type: barrelType,
          pick_name: val("pick_name") || null,
          bottling_year: numOrNull("bottling_year"),
          batch_code: val("batch_code") || null,
          cask_strength: false,
          email_address: email,
          ig_account: ig
        })
      );
    }

    if (existingPickerId || val("barrel_picker_name")) {
      await must(
        "Create barrel picker submission",
        supabase.from("stg_barrel_picker_submission").insert({
          submission_id,
          existing_barrel_picker_id: existingPickerId,
          barrel_picker_name: val("barrel_picker_name") || null,
          email_address: email,
          ig_account: ig
        })
      );
    }

    setStatus("Submission complete. Thank you!");
  } catch (e) {
    console.error(e);
    setStatus(`Submission failed: ${e.message}`);
  }
}

loadDropdowns()
  .then(wireUI)
  .catch((e) => {
    console.error(e);
    setStatus(`Page failed to load: ${e.message}`);
  });
