import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function verifySquareSignature(
  body: string,
  signatureHeader: string,
  signatureKey: string,
  notificationUrl: string
): boolean {
  const hmac = createHmac("sha256", signatureKey);
  hmac.update(notificationUrl + body);
  const expectedSignature = hmac.digest("base64");
  return expectedSignature === signatureHeader;
}

export async function POST(request: NextRequest) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) {
    console.error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signatureHeader = request.headers.get("x-square-hmacsha256-signature") ?? "";
  const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`;

  if (!verifySquareSignature(body, signatureHeader, signatureKey, notificationUrl)) {
    console.warn("Square webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  type SquareWebhookEvent = {
    type?: string;
    data?: {
      object?: {
        payment?: {
          reference_id?: string;
          status?: string;
          total_money?: { amount?: number };
        };
      };
    };
  };

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(body) as SquareWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "payment.completed") {
    return NextResponse.json({ received: true });
  }

  const payment = event.data?.object?.payment;
  const invoiceId = payment?.reference_id;

  if (!invoiceId) {
    return NextResponse.json({ received: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase service role not configured");
    return NextResponse.json({ error: "Service not configured" }, { status: 500 });
  }

  const serviceClient = createSupabaseClient(supabaseUrl, serviceKey);

  const { error } = await serviceClient
    .from("invoices")
    .update({
      status: "paid",
      payment_method: "square",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .neq("status", "paid");

  if (error) {
    console.error("Webhook: failed to mark invoice paid:", error.message);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
