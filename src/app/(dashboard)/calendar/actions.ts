"use server";

import { createClient } from "@/lib/supabase/server";

export type AppointmentRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  appointment_type_id: string;
  location_type: string;
  location_address: string | null;
  travel_time_minutes: number;
  notes: string | null;
  // Clinical note fields
  consult_date: string | null;
  presenting_complaint: string | null;
  history: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  clinical_status: "none" | "draft" | "finalised";
  finalised_at: string | null;
  patient: { id: string; name: string; species: string; allergies: string[] | null } | null;
  client: { id: string; name: string; phone: string | null } | null;
};

export async function getAppointments(date: string): Promise<AppointmentRow[]> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return [];

  const { data: userPractices, error: practiceError } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  if (practiceError || !userPractices || userPractices.length === 0) return [];

  const practiceIds = userPractices.map((up) => up.practice_id);

  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(
      `id, date, start_time, end_time, duration_minutes, status,
       appointment_type_id, location_type, location_address, travel_time_minutes, notes,
       consult_date, presenting_complaint, history, examination, diagnosis, treatment_plan,
       clinical_status, finalised_at,
       patient:patients(id, name, species, allergies),
       client:clients(id, name, phone)`
    )
    .eq("date", date)
    .in("practice_id", practiceIds)
    .order("start_time", { ascending: true });

  if (apptError) {
    console.error("Failed to fetch appointments:", apptError.message);
    return [];
  }

  return (appointments ?? []) as unknown as AppointmentRow[];
}
