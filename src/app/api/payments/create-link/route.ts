import { NextRequest, NextResponse } from "next/server";
import { squareClient } from "@/lib/square";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    invoiceId: string;
    invoiceNumber: string;
    totalCents: number;
  };

  if (!body.invoiceId || !body.totalCents) {
    return NextResponse.json({ error: "invoiceId and totalCents required" }, { status: 400 });
  }

  try {
    const { paymentLink } = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!,
        referenceId: body.invoiceId,
        lineItems: [
          {
            name: `Invoice ${body.invoiceNumber}`,
            quantity: "1",
            basePriceMoney: {
              amount: BigInt(body.totalCents) as unknown as bigint,
              currency: "AUD",
            },
          },
        ],
      },
      checkoutOptions: {
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${body.invoiceId}`,
        askForShippingAddress: false,
      },
    });

    const url = paymentLink?.url;
    if (!url) {
      return NextResponse.json({ error: "Square did not return a payment link" }, { status: 500 });
    }

    // Mark invoice as sent
    await supabase
      .from("invoices")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", body.invoiceId)
      .eq("status", "draft");

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment link";
    console.error("Square payment link error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
