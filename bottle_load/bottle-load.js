import { supabase } from "../assets/js/supabaseClient.js";

const el = (id) => document.getElementById(id);

async function loadDropdowns() {
  const { data: distilleries } = await supabase
    .from("v_coterie_distillery_options")
    .select("*");

  el("distillerySelect").innerHTML =
    `<option value="">Select Distillery</option>` +
    distilleries.map(d =>
      `<option value="${d.distillery_id}">${d.distillery_name}</option>`
    ).join("");

  const { data: bottles } = await supabase
    .from("v_coterie_bottle_options")
    .select("*");

  el("bottleSelect").innerHTML =
    `<option value="">Select Bottle</option>` +
    bottles.map(b =>
      `<option value="${b.bottle_id}">${b.bottle_display_name}</option>`
    ).join("");

  const { data: pickers } = await supabase
    .from("v_coterie_barrel_picker_options")
    .select("*");

  el("pickerSelect").innerHTML =
    `<option value="">Select Picker</option>` +
    pickers.map(p =>
      `<option value="${p.barrel_picker_id}">${p.barrel_picker_name}</option>`
    ).join("");
}

function wireUI() {
  el("addDistilleryBtn").onclick = () =>
    el("distilleryForm").style.display = "block";

  el("addBottleBtn").onclick = () =>
    el("bottleForm").style.display = "block";

  el("addPickerBtn").onclick = () =>
    el("pickerForm").style.display = "block";

  el("barrelType").onchange = () => {
    el("singleBarrelForm").style.display =
      el("barrelType").value ? "block" : "none";
  };
}

async function submit() {
  const email = el("email").value;

  const { data: submission } = await supabase
    .from("stg_bottle_load_submission")
    .insert({ email_address: email })
    .select()
    .single();

  const submission_id = submission.submission_id;

  await supabase.from("stg_distillery_submission").insert({
    submission_id,
    existing_distillery_id: el("distillerySelect").value || null,
    distillery_name: el("distillery_name").value || null,
    country: el("country").value || null,
    state: el("state").value || null,
    address_line_1: el("address_line_1").value || null,
    city: el("city").value || null,
    postal_code: el("postal_code").value || null,
    email_address: email
  });

  await supabase.from("stg_bottle_submission").insert({
    submission_id,
    existing_bottle_id: el("bottleSelect").value || null,
    brand_name: el("brand_name").value || null,
    expression_name: el("expression_name").value || null,
    spirit_category: el("spirit_category").value || null,
    abv: Number(el("abv").value) || null,
    size_ml: Number(el("size_ml").value) || null,
    email_address: email
  });

  await supabase.from("stg_single_barrel_submission").insert({
    submission_id,
    bottle_detail_type: el("barrelType").value || null,
    pick_name: el("pick_name").value || null,
    bottling_year: Number(el("bottling_year").value) || null,
    batch_code: el("batch_code").value || null,
    email_address: email
  });

  await supabase.from("stg_barrel_picker_submission").insert({
    submission_id,
    existing_barrel_picker_id: el("pickerSelect").value || null,
    barrel_picker_name: el("barrel_picker_name").value || null,
    email_address: email
  });

  el("status").textContent = "Submission complete!";
}

el("submitBtn").onclick = submit;

loadDropdowns();
wireUI();
