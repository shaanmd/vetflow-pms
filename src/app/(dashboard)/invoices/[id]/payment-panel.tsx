"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Link2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { markInvoicePaidManual } from "./actions";
import { useRouter } from "next/navigation";

interface InvoicePaymentPanelProps {
  invoiceId: string;
  invoiceNumber: string;
  total: number;
  clientEmail: string | null;
}

export function InvoicePaymentPanel({
  invoiceId,
  invoiceNumber,
  total,
  clientEmail,
}: InvoicePaymentPanelProps) {
  const router = useRouter();
  const [generatingLink, setGeneratingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [manualMethod, setManualMethod] = useState("cash");

  const totalCents = Math.round(total * 100);

  async function handleGenerateLink() {
    setGeneratingLink(true);
    try {
      const response = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, invoiceNumber, totalCents }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || data.error) {
        toast.error(data.error ?? "Failed to create payment link");
        return;
      }
      setPaymentLink(data.url ?? null);
      toast.success("Payment link created");
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleCopyLink() {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    toast.success("Link copied to clipboard");
  }

  async function handleMarkPaid() {
    setMarkingPaid(true);
    const result = await markInvoicePaidManual(invoiceId, manualMethod);
    setMarkingPaid(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invoice marked as paid");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!paymentLink ? (
          <Button
            variant="outline"
            className="w-full min-h-[44px]"
            onClick={handleGenerateLink}
            disabled={generatingLink}
          >
            {generatingLink ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating link...</>
            ) : (
              <><Link2 className="h-4 w-4 mr-2" />Generate Square Payment Link</>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground break-all font-mono bg-muted rounded-md px-2 py-1.5">
              {paymentLink}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full min-h-[40px]"
              onClick={handleCopyLink}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
              Copy Link
            </Button>
            {clientEmail && (
              <p className="text-xs text-muted-foreground text-center">
                Share with {clientEmail}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Select value={manualMethod} onValueChange={(value) => { if (value) setManualMethod(value); }}>
            <SelectTrigger className="min-h-[44px] flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="eftpos">EFTPOS</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="square_terminal">Square Terminal</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="min-h-[44px]"
            onClick={handleMarkPaid}
            disabled={markingPaid}
          >
            {markingPaid && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Mark Paid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
