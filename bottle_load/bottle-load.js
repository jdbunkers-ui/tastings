import { supabase } from "../assets/js/supabaseClient.js";

const el = (id) => document.getElementById(id);

let allBottles = [];

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

function renderBottleOptions(bottles) {
  el("bottleSelect").innerHTML =
    `<option value="">Select Bottle</option>` +
    (bottles || [])
      .map(
        (b) =>
          `<option value="${b.bottle_id}">${b.bottle_display_name || "Unnamed Bottle"}</option>`
      )
      .join("");
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

  allBottles = await must(
    "Load bottles",
    supabase.from("v_coterie_bottle_options").select("*")
  );

  renderBottleOptions(allBottles);

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

function show(id) {
  el(id).style.display = "block";
}

function hide(id) {
  el(id).style.display = "none";
}

function clearNewDistilleryFields() {
  ["distillery_name", "country", "state", "address_line_1", "city", "postal_code"].forEach(
    (id) => (el(id).value = "")
  );
}

function clearNewBottleFields() {
  ["brand_name", "expression_name", "spirit_category", "abv", "size_ml"].forEach(
    (id) => (el(id).value = "")
  );
}

function clearSingleBarrelFields() {
  ["pick_name", "bottling_year", "batch_code"].forEach((id) => (el(id).value = ""));
}

function clearPickerFields() {
  ["barrel_picker_name"].forEach((id) => (el(id).value = ""));
}

function resetFormAfterSuccess() {
  el("distillerySelect").disabled = false;
  el("bottleSelect").disabled = false;

  el("distillerySelect").value = "";
  el("bottleSelect").value = "";
  el("pickerSelect").value = "";
  el("barrelType").value = "";

  clearNewDistilleryFields();
  clearNewBottleFields();
  clearSingleBarrelFields();
  clearPickerFields();

  hide("distilleryForm");
  hide("bottleForm");
  hide("singleBarrelForm");
  hide("pickerForm");

  renderBottleOptions(allBottles);
}

function wireUI() {
  el("distillerySelect").onchange = () => {
    const distilleryId = val("distillerySelect");

    if (!distilleryId) {
      renderBottleOptions(allBottles);
      return;
    }

    const filtered = allBottles.filter(
      (b) => String(b.distillery_id) === String(distilleryId)
    );

    renderBottleOptions(filtered);
  };

  el("addDistilleryBtn").onclick = () => {
    show("distilleryForm");
    show("bottleForm");

    el("distillerySelect").value = "";
    el("bottleSelect").value = "";

    el("bottleSelect").disabled = true;

    clearNewBottleFields();

    setStatus("New distillery selected. Please add a new bottle as well.");
  };

  el("addBottleBtn").onclick = () => {
    show("bottleForm");
    el("bottleSelect").value = "";
  };

  el("addPickerBtn").onclick = () => {
    show("pickerForm");
    el("pickerSelect").value = "";
  };

  el("barrelType").onchange = () => {
    if (val("barrelType")) show("singleBarrelForm");
    else hide("singleBarrelForm");
  };

  el("submitBtn").onclick = submit;
}

function validateBeforeSubmit() {
  const email = val("email");
  const existingDistilleryId = val("distillerySelect");
  const existingBottleId = val("bottleSelect");

  const isNewDistillery = el("distilleryForm").style.display !== "none";
  const isNewBottle = el("bottleForm").style.display !== "none";
  const isNewPicker = el("pickerForm").style.display !== "none";
  
  if (isNewPicker && !val("barrel_picker_name")) {
    throw new Error("Barrel picker name is required when adding a new barrel picker.");
  }
  
  if (!email) throw new Error("Email is required.");

  if (!existingDistilleryId && !isNewDistillery) {
    throw new Error("Please select an existing distillery or add a new distillery.");
  }

  if (isNewDistillery && !isNewBottle) {
    throw new Error("A new distillery requires a new bottle.");
  }

  if (!existingBottleId && !isNewBottle) {
    throw new Error("Please select an existing bottle or add a new bottle.");
  }

  if (isNewBottle) {
    if (!val("brand_name")) throw new Error("Brand name is required for a new bottle.");
    if (!val("expression_name")) throw new Error("Expression name is required for a new bottle.");
    if (!val("spirit_category")) throw new Error("Spirit category is required for a new bottle.");
  }

  if (isNewDistillery) {
    if (!val("distillery_name")) throw new Error("Distillery name is required.");
    if (!val("country")) throw new Error("Country is required.");
    if (!val("state")) throw new Error("State is required.");
    if (!val("address_line_1")) throw new Error("Address line 1 is required.");
    if (!val("city")) throw new Error("City is required.");
    if (!val("postal_code")) throw new Error("Postal code is required.");
  }
}

async function submit() {
  try {
    setStatus("Submitting…");
    validateBeforeSubmit();

    const email = val("email");
    const ig = val("ig") || null;

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
        finished_ind: false,
        chill_filtered_ind: false,
        single_barrel_ind: barrelType === "SINGLE_BARREL",
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
    resetFormAfterSuccess();
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
