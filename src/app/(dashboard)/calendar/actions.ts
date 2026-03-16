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
  patient: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
};

export async function getAppointments(date: string): Promise<AppointmentRow[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  // Get all practice IDs for the current user
  const { data: userPractices, error: practiceError } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  if (practiceError || !userPractices || userPractices.length === 0) {
    return [];
  }

  const practiceIds = userPractices.map((up) => up.practice_id);

  const { data: appointments, error: apptError } = await supabase
    .from("appointments")
    .select(
      `
      id,
      date,
      start_time,
      end_time,
      duration_minutes,
      status,
      appointment_type_id,
      location_type,
      location_address,
      travel_time_minutes,
      notes,
      patient:patients(id, name),
      client:clients(id, name)
    `
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
