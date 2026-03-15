// VetFlowPMS Database Types
// These map to the Supabase schema defined in the PRD

export type UserRole = "owner" | "clinic_owner" | "vet" | "admin" | "client" | "locum";
export type PatientSpecies = "dog" | "cat" | "horse" | "other";
export type PatientStatus = "active" | "deceased" | "transferred";
export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type ConsultStatus = "draft" | "finalised";
export type InvoiceStatus = "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "void";
export type LocationType = "clinic" | "house_call";

export interface Practice {
  id: string;
  name: string;
  entity_name: string;
  abn: string | null;
  logo_url: string | null;
  brand_colours: Record<string, string> | null;
  timezone: string;
  currency: "AUD" | "NZD";
  tax_rate: number;
  address: string | null;
  phone: string | null;
  email: string | null;
  booking_url: string | null;
  settings: PracticeSettings | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeSettings {
  appointment_types: AppointmentType[];
  booking_rules: BookingRules | null;
  invoice_prefix: string;
  travel_buffer_minutes: number;
}

export interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  colour: string;
  price: number | null;
  requires_deposit: boolean;
  deposit_amount: number | null;
}

export interface BookingRules {
  max_per_day: number | null;
  blocked_days: number[];
  lead_time_hours: number;
  cancellation_window_hours: number;
  cancellation_fee: number | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  access_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPractice {
  user_id: string;
  practice_id: string;
  role: UserRole;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  communication_preferences: Record<string, boolean> | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  name: string;
  species: PatientSpecies;
  breed: string | null;
  sex: string | null;
  dob: string | null;
  microchip: string | null;
  photo_url: string | null;
  status: PatientStatus;
  allergies: string[] | null;
  conditions: string[] | null;
  owner_id: string;
  practice_id: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  appointment_type_id: string;
  patient_id: string;
  client_id: string;
  vet_id: string;
  practice_id: string;
  location_type: LocationType;
  location_address: string | null;
  travel_time_minutes: number | null;
  notes: string | null;
  booked_by: "client" | "admin" | "vet";
  created_at: string;
  updated_at: string;
}

export interface Consult {
  id: string;
  consult_date: string;
  created_at: string;
  appointment_id: string | null;
  patient_id: string;
  vet_id: string;
  practice_id: string;
  presenting_complaint: string | null;
  history: string | null;
  examination: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  notes_transcript: string | null;
  notes_ai_generated: string | null;
  template_used: string | null;
  status: ConsultStatus;
  finalised_at: string | null;
  finalised_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: InvoiceStatus;
  client_id: string;
  practice_id: string;
  consult_id: string | null;
  performing_vet_id: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  type: "service" | "product" | "package";
  category: string;
  practice_id: string;
  price: number;
  tax_rate: number;
  stock_qty: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
