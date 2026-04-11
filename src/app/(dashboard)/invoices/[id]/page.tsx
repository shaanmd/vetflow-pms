import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInvoiceDetail } from "./actions";
import { InvoicePaymentPanel } from "./payment-panel";

function formatAUD(amount: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount);
}

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
  void: "bg-gray-100 text-gray-400",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoice = await getInvoiceDetail(id);
  if (!invoice) notFound();

  const isPaid = invoice.status === "paid";

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">
            {invoice.invoice_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoice.client?.name ?? "Unknown Client"}
            {invoice.client?.email && ` · ${invoice.client.email}`}
          </p>
        </div>
        <Badge variant="secondary" className={statusStyles[invoice.status] ?? ""}>
          {invoice.status}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-right px-4 py-2 font-medium">Qty</th>
                <th className="text-right px-4 py-2 font-medium">Price</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.line_items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">{item.description}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatAUD(item.unit_price)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatAUD(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatAUD(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST</span>
            <span>{formatAUD(invoice.tax_amount)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatAUD(invoice.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>{formatAUD(invoice.total)}</span>
          </div>
          {isPaid && invoice.paid_at && (
            <p className="text-xs text-green-600 text-right">
              Paid {new Date(invoice.paid_at).toLocaleDateString("en-AU")}
              {invoice.payment_method && ` via ${invoice.payment_method}`}
            </p>
          )}
        </CardContent>
      </Card>

      {!isPaid && (
        <InvoicePaymentPanel
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          total={invoice.total}
          clientEmail={invoice.client?.email ?? null}
        />
      )}
    </div>
  );
}
