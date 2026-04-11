"use server";

import { createClient } from "@/lib/supabase/server";

export type ClientOption = { id: string; name: string; email: string | null };
export type ProductOption = {
  id: string;
  name: string;
  type: string;
  price: number;
  tax_rate: number;
};

export async function getClientsForPractice(): Promise<ClientOption[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: up } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (up ?? []).map((r) => r.practice_id);
  if (practiceIds.length === 0) return [];

  const { data } = await supabase
    .from("clients")
    .select("id, name, email")
    .in(
      "id",
      (await supabase
        .from("client_practices")
        .select("client_id")
        .in("practice_id", practiceIds)
      ).data?.map((r) => r.client_id) ?? []
    )
    .order("name");

  return (data ?? []) as ClientOption[];
}

export async function getProductsForPractice(): Promise<ProductOption[]> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: up } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (up ?? []).map((r) => r.practice_id);
  if (practiceIds.length === 0) return [];

  const { data } = await supabase
    .from("products")
    .select("id, name, type, price, tax_rate")
    .in("practice_id", practiceIds)
    .eq("is_active", true)
    .order("name");

  return (data ?? []) as ProductOption[];
}

interface LineItem {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export async function createInvoice(
  clientId: string,
  lineItems: LineItem[],
  appointmentId: string | null
): Promise<{ error?: string; invoiceId?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!clientId) return { error: "Client is required" };
  if (lineItems.length === 0) return { error: "At least one line item is required" };

  const { data: up } = await supabase
    .from("user_practices")
    .select("practice_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!up) return { error: "Practice not found" };

  const { data: practice } = await supabase
    .from("practices")
    .select("settings, tax_rate")
    .eq("id", up.practice_id)
    .single();

  const prefix = (practice?.settings as { invoice_prefix?: string } | null)?.invoice_prefix ?? "INV";
  const invoiceNumber = `${prefix}-${Date.now().toString().slice(-6)}`;

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100,
    0
  );
  const total = subtotal + taxAmount;

  const today = new Date().toISOString().split("T")[0];
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      date: today,
      due_date: dueDate,
      status: "draft",
      client_id: clientId,
      practice_id: up.practice_id,
      appointment_id: appointmentId,
      performing_vet_id: user.id,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(taxAmount * 100) / 100,
      discount_amount: 0,
      total: Math.round(total * 100) / 100,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    console.error("createInvoice error:", invoiceError?.message);
    return { error: invoiceError?.message ?? "Failed to create invoice" };
  }

  const lineItemRows = lineItems.map((item, index) => ({
    invoice_id: invoice.id,
    product_id: item.product_id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    tax_rate: item.tax_rate,
    total: Math.round(item.quantity * item.unit_price * (1 + item.tax_rate / 100) * 100) / 100,
    sort_order: index,
  }));

  const { error: lineItemError } = await supabase
    .from("invoice_line_items")
    .insert(lineItemRows);

  if (lineItemError) {
    console.error("createInvoice line items error:", lineItemError.message);
    return { invoiceId: invoice.id, error: "Line items failed to save — edit the invoice to fix" };
  }

  return { invoiceId: invoice.id };
}
