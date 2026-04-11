"use server";

import { createClient } from "@/lib/supabase/server";

interface DraftData {
  consult_date: string;
  presenting_complaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  treatment_plan: string;
}

export async function saveConsultDraft(
  appointmentId: string,
  data: DraftData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("appointments")
    .update({
      consult_date: data.consult_date,
      presenting_complaint: data.presenting_complaint || null,
      history: data.history || null,
      examination: data.examination || null,
      diagnosis: data.diagnosis || null,
      treatment_plan: data.treatment_plan || null,
      clinical_status: "draft",
      updated_by: user.id,
    })
    .eq("id", appointmentId)
    .neq("clinical_status", "finalised"); // belt-and-suspenders; DB trigger also blocks

  if (error) {
    console.error("saveConsultDraft error:", error.message);
    return { error: error.message };
  }

  return {};
}

export async function finaliseConsult(
  appointmentId: string,
  data: DraftData
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  const { data: appt, error: fetchError } = await supabase
    .from("appointments")
    .select("practice_id, clinical_status")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appt) return { error: "Appointment not found" };
  if (appt.clinical_status === "finalised") return { error: "Consult is already finalised" };

  const { error: updateError } = await supabase
    .from("appointments")
    .update({
      consult_date: data.consult_date,
      presenting_complaint: data.presenting_complaint || null,
      history: data.history || null,
      examination: data.examination || null,
      diagnosis: data.diagnosis || null,
      treatment_plan: data.treatment_plan || null,
      clinical_status: "finalised",
      finalised_at: new Date().toISOString(),
      finalised_by: user.id,
      updated_by: user.id,
    })
    .eq("id", appointmentId);

  if (updateError) {
    console.error("finaliseConsult update error:", updateError.message);
    return { error: updateError.message };
  }

  // Write audit log via SECURITY DEFINER function
  await supabase.rpc("write_audit_log", {
    p_practice_id: appt.practice_id,
    p_entity_type: "appointment",
    p_entity_id: appointmentId,
    p_action: "finalise",
    p_changes: data,
  });

  return {};
}

export async function addConsultAddendum(
  appointmentId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Not authenticated" };

  if (!content.trim()) return { error: "Addendum content cannot be empty" };

  const { error } = await supabase
    .from("appointment_addendums")
    .insert({
      appointment_id: appointmentId,
      content: content.trim(),
      added_by: user.id,
    });

  if (error) {
    console.error("addConsultAddendum error:", error.message);
    return { error: error.message };
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("practice_id")
    .eq("id", appointmentId)
    .single();

  if (appt) {
    await supabase.rpc("write_audit_log", {
      p_practice_id: appt.practice_id,
      p_entity_type: "appointment_addendum",
      p_entity_id: appointmentId,
      p_action: "create",
      p_changes: { content: content.trim() },
    });
  }

  return {};
}
