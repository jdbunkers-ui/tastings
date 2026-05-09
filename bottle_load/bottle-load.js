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

function intOrNull(id) {
  const raw = val(id);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function boolOrDefault(id, defaultValue = false) {
  const raw = val(id);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return defaultValue;
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

function clearFields(ids) {
  ids.forEach((id) => {
    if (el(id)) el(id).value = "";
  });
}

function clearNewDistilleryFields() {
  clearFields([
    "distillery_name",
    "country",
    "state",
    "address_line_1",
    "address_line_2",
    "city",
    "postal_code",
    "distillery_description",
    "distillery_photo_filename",
    "latitude",
    "longitude",
    "canonical_distillery_name",
    "distillery_submitter_notes"
  ]);
}

function clearNewBottleFields() {
  clearFields([
    "brand_name",
    "expression_name",
    "spirit_category",
    "spirit_subtype",
    "bottling_strength_type",
    "age_in_month_qty",
    "abv",
    "size_ml",
    "mash_bill",
    "finished_type",
    "msrp",
    "upc_ean",
    "peat_level",
    "age_method",
    "cask_type_primary",
    "bottle_warehouse",
    "bottle_submitter_notes"
  ]);

  if (el("finished_ind")) el("finished_ind").value = "";
  if (el("chill_filtered_ind")) el("chill_filtered_ind").value = "";
}

function clearSingleBarrelFields() {
  clearFields([
    "pick_name",
    "bottling_year",
    "batch_code",
    "sb_warehouse",
    "abv_override",
    "age_statement_total_months",
    "distilled_state",
    "bottled_state",
    "single_barrel_description",
    "bottle_img_ref",
    "single_barrel_submitter_notes"
  ]);

  if (el("cask_strength")) el("cask_strength").value = "false";
}

function clearPickerFields() {
  clearFields([
    "barrel_picker_name",
    "barrel_picker_type",
    "picker_country",
    "picker_state",
    "picker_city",
    "picker_postal_code",
    "picker_address_line_1",
    "picker_address_line_2",
    "full_address",
    "phone_number",
    "instagram_url",
    "facebook_url",
    "website_url",
    "google_maps_url",
    "picker_notes",
    "barrel_picker_description",
    "barrel_picker_submitter_notes"
  ]);
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

  hide("distilleryAdvanced");
  hide("bottleAdvanced");
  hide("singleBarrelAdvanced");
  hide("pickerAdvanced");

  renderBottleOptions(allBottles);
}

function wireAdvancedToggles() {
  document.querySelectorAll(".advanced-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (!target || !el(target)) return;

      const isHidden = el(target).style.display === "none" || !el(target).style.display;
      el(target).style.display = isHidden ? "block" : "none";
    });
  });
}

function wireUI() {
  el("distillerySelect").onchange = () => {
    const distilleryId = val("distillerySelect");

    if (distilleryId) {
      hide("distilleryForm");
      clearNewDistilleryFields();
      el("bottleSelect").disabled = false;
    }

    if (!distilleryId) {
      renderBottleOptions(allBottles);
      return;
    }

    const filtered = allBottles.filter(
      (b) => String(b.distillery_id) === String(distilleryId)
    );

    renderBottleOptions(filtered);
  };

  el("bottleSelect").onchange = () => {
    if (val("bottleSelect")) {
      hide("bottleForm");
      clearNewBottleFields();
    }
  };

  el("pickerSelect").onchange = () => {
    if (val("pickerSelect")) {
      hide("pickerForm");
      clearPickerFields();
    }
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

  wireAdvancedToggles();
}

function validateBeforeSubmit() {
  const email = val("email");
  const existingDistilleryId = val("distillerySelect");
  const existingBottleId = val("bottleSelect");

  const isNewDistillery = el("distilleryForm").style.display !== "none";
  const isNewBottle = el("bottleForm").style.display !== "none";
  const isNewPicker = el("pickerForm").style.display !== "none";
  const hasBottleDetail = !!val("barrelType");

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

  if (hasBottleDetail && !val("pick_name")) {
    throw new Error("Pick Name / Batch is required when adding Single Barrel or Vintage details.");
  }

  if (isNewPicker && !val("barrel_picker_name")) {
    throw new Error("Barrel picker name is required when adding a new barrel picker.");
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
        address_line_2: val("address_line_2") || null,
        city: val("city") || null,
        postal_code: val("postal_code") || null,
        distillery_description: val("distillery_description") || null,
        distillery_photo_filename: val("distillery_photo_filename") || null,
        latitude: numOrNull("latitude"),
        longitude: numOrNull("longitude"),
        canonical_distillery_name: val("canonical_distillery_name") || null,
        submitter_notes: val("distillery_submitter_notes") || null,
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
        upc_ean: val("upc_ean") || null,
        brand_name: val("brand_name") || null,
        expression_name: val("expression_name") || null,
        spirit_category: val("spirit_category") || null,
        spirit_subtype: val("spirit_subtype") || null,
        bottling_strength_type: val("bottling_strength_type") || null,
        age_in_month_qty: intOrNull("age_in_month_qty"),
        abv: numOrNull("abv"),
        size_ml: intOrNull("size_ml"),
        finished_ind: boolOrDefault("finished_ind", false),
        chill_filtered_ind: boolOrDefault("chill_filtered_ind", false),
        single_barrel_ind: barrelType === "SINGLE_BARREL",
        mash_bill: val("mash_bill") || null,
        finished_type: val("finished_type") || null,
        peat_level: val("peat_level") || null,
        age_method: val("age_method") || null,
        cask_type_primary: val("cask_type_primary") || null,
        warehouse: val("bottle_warehouse") || null,
        msrp: numOrNull("msrp"),
        submitter_notes: val("bottle_submitter_notes") || null,
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
          bottling_year: intOrNull("bottling_year"),
          batch_code: val("batch_code") || null,
          warehouse: val("sb_warehouse") || null,
          cask_strength: boolOrDefault("cask_strength", false),
          abv_override: numOrNull("abv_override"),
          age_statement_total_months: intOrNull("age_statement_total_months"),
          distilled_state: val("distilled_state") || null,
          bottled_state: val("bottled_state") || null,
          single_barrel_description: val("single_barrel_description") || null,
          bottle_img_ref: val("bottle_img_ref") || null,
          submitter_notes: val("single_barrel_submitter_notes") || null,
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
          barrel_picker_type: val("barrel_picker_type") || null,
          country: val("picker_country") || null,
          state: val("picker_state") || null,
          city: val("picker_city") || null,
          postal_code: val("picker_postal_code") || null,
          address_line_1: val("picker_address_line_1") || null,
          address_line_2: val("picker_address_line_2") || null,
          full_address: val("full_address") || null,
          phone_number: val("phone_number") || null,
          instagram_url: val("instagram_url") || null,
          facebook_url: val("facebook_url") || null,
          website_url: val("website_url") || null,
          google_maps_url: val("google_maps_url") || null,
          notes: val("picker_notes") || null,
          barrel_picker_description: val("barrel_picker_description") || null,
          submitter_notes: val("barrel_picker_submitter_notes") || null,
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
