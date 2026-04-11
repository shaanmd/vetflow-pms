"use server";

import { createClient } from "@/lib/supabase/server";
import type { DrugSchedule } from "@/types/database";

export type PrescriptionRow = {
  id: string;
  medication: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
  schedule: DrugSchedule | null;
  batch_number: string | null;
  dispensed: boolean;
};

export async function getPrescriptions(appointmentId: string): Promise<PrescriptionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prescriptions")
    .select("id, medication, dose, frequency, duration, quantity, instructions, schedule, batch_number, dispensed")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function createPrescription(
  appointmentId: string,
  patientId: string,
  prescription: {
    medication: string;
    dose: string;
    frequency: string;
    duration: string;
    quantity: string;
    instructions: string;
    schedule: DrugSchedule | null;
    batch_number: string;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  if (!prescription.medication.trim()) return { error: "Medication name is required" };

  const { error } = await supabase
    .from("prescriptions")
    .insert({
      appointment_id: appointmentId,
      patient_id: patientId,
      medication: prescription.medication.trim(),
      dose: prescription.dose || null,
      frequency: prescription.frequency || null,
      duration: prescription.duration || null,
      quantity: prescription.quantity || null,
      instructions: prescription.instructions || null,
      schedule: prescription.schedule,
      batch_number: prescription.batch_number || null,
    });

  if (error) {
    console.error("createPrescription error:", error.message);
    return { error: error.message };
  }

  return {};
}
