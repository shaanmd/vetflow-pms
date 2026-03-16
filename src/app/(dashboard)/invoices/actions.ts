"use server";

import { createClient } from "@/lib/supabase/server";

// ── Types ──────────────────────────────────────────────────────

export type UnbilledAppointment = {
  id: string;
  date: string;
  appointment_type_id: string;
  client_id: string;
  vet_id: string;
  practice_id: string;
  patient: { id: string; name: string } | null;
  client: { id: string; name: string } | null;
  vet: { id: string; name: string } | null;
};

export type PracticeProduct = {
  id: string;
  name: string;
  type: string;
  category: string | null;
  price: number;
  tax_rate: number;
};

export type InvoiceLineItemInput = {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  sort_order: number;
};

export type CreateInvoiceInput = {
  practice_id: string;
  client_id: string;
  appointment_id: string;
  performing_vet_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  line_items: InvoiceLineItemInput[];
};

// ── Helpers ────────────────────────────────────────────────────

async function getUserPracticeIds() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, practiceIds: [] as string[], user: null };

  const { data: userPractices } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (userPractices ?? []).map((r) => r.practice_id);
  return { supabase, practiceIds, user };
}

// ── Server Actions ─────────────────────────────────────────────

export async function getUnbilledAppointments(): Promise<UnbilledAppointment[]> {
  const { supabase, practiceIds } = await getUserPracticeIds();
  if (practiceIds.length === 0) return [];

  // Get appointment IDs that already have invoices
  const { data: invoiced } = await supabase
    .from("invoices")
    .select("appointment_id")
    .in("practice_id", practiceIds)
    .not("appointment_id", "is", null);

  const invoicedIds = (invoiced ?? [])
    .map((r) => r.appointment_id)
    .filter(Boolean) as string[];

  // Get completed appointments
  let query = supabase
    .from("appointments")
    .select(
      `
      id,
      date,
      appointment_type_id,
      client_id,
      vet_id,
      practice_id,
      patient:patients(id, name),
      client:clients(id, name),
      vet:users!appointments_vet_id_fkey(id, name)
    `
    )
    .eq("status", "completed")
    .in("practice_id", practiceIds)
    .order("date", { ascending: false });

  if (invoicedIds.length > 0) {
    // Exclude appointments that already have invoices
    query = query.not("id", "in", `(${invoicedIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch unbilled appointments:", error.message);
    return [];
  }

  return (data ?? []) as unknown as UnbilledAppointment[];
}

export async function getPracticeProducts(
  practiceId: string
): Promise<PracticeProduct[]> {
  const { supabase } = await getUserPracticeIds();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, type, category, price, tax_rate")
    .eq("practice_id", practiceId)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Failed to fetch products:", error.message);
    return [];
  }

  return (data ?? []) as PracticeProduct[];
}

export async function getNextInvoiceNumber(
  practiceId: string
): Promise<string> {
  const { supabase } = await getUserPracticeIds();

  // Get the invoice prefix from practice settings
  const { data: practice } = await supabase
    .from("practices")
    .select("settings")
    .eq("id", practiceId)
    .single();

  const prefix =
    (practice?.settings as Record<string, unknown> | null)?.invoice_prefix ??
    "INV";

  // Find the max invoice number for this practice
  const { data: invoices } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("practice_id", practiceId)
    .order("created_at", { ascending: false })
    .limit(100);

  let maxNum = 0;
  for (const inv of invoices ?? []) {
    // Extract numeric part after prefix + dash, e.g. "SM-0012" -> 12
    const match = inv.invoice_number?.match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

export async function createInvoice(
  input: CreateInvoiceInput
): Promise<{ id: string } | { error: string }> {
  const { supabase, user } = await getUserPracticeIds();
  if (!user) return { error: "Not authenticated" };

  const { line_items, ...invoiceData } = input;

  // Insert the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      ...invoiceData,
      status: "draft",
    })
    .select("id")
    .single();

  if (invoiceError) {
    console.error("Failed to create invoice:", invoiceError.message);
    return { error: invoiceError.message };
  }

  // Insert line items
  const lineItemRows = line_items.map((item, idx) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
    total: item.total,
    sort_order: idx,
  }));

  if (lineItemRows.length > 0) {
    const { error: lineError } = await supabase
      .from("invoice_line_items")
      .insert(lineItemRows);

    if (lineError) {
      console.error("Failed to create line items:", lineError.message);
      // Clean up the invoice if line items fail
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return { error: lineError.message };
    }
  }

  return { id: invoice.id };
}
