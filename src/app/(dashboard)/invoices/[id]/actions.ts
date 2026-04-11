"use server";

import { createClient } from "@/lib/supabase/server";

export type InvoiceDetail = {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string | null;
  paid_at: string | null;
  client: { id: string; name: string; email: string | null; phone: string | null } | null;
  line_items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    total: number;
  }[];
};

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoice } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, date, due_date, status,
      subtotal, tax_amount, discount_amount, total,
      payment_method, paid_at,
      client:clients(id, name, email, phone)
    `)
    .eq("id", invoiceId)
    .single();

  if (!invoice) return null;

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("id, description, quantity, unit_price, tax_rate, total")
    .eq("invoice_id", invoiceId)
    .order("sort_order");

  return {
    ...invoice,
    client: Array.isArray(invoice.client) ? invoice.client[0] : invoice.client,
    line_items: lineItems ?? [],
  } as InvoiceDetail;
}

export async function markInvoiceSent(invoiceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .eq("status", "draft");
  return error ? { error: error.message } : {};
}

export async function markInvoicePaidManual(
  invoiceId: string,
  paymentMethod: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .neq("status", "paid");
  return error ? { error: error.message } : {};
}
