import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertTriangle, DollarSign, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

const AR_STATUSES = ["sent", "overdue", "partially_paid"];

function formatAUD(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(cents);
}

export default async function InvoicesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get practice IDs for this user
  const { data: userPractices } = await supabase
    .from("user_practices")
    .select("practice_id")
    .eq("user_id", user.id);

  const practiceIds = (userPractices ?? []).map((r) => r.practice_id);

  // Fetch invoices joined with clients for client name, ordered by date desc
  const { data: invoices } = practiceIds.length > 0
    ? await supabase
        .from("invoices")
        .select("id, invoice_number, date, total, status, clients(name)")
        .in("practice_id", practiceIds)
        .order("date", { ascending: false })
    : { data: [] };

  const rows = invoices ?? [];

  // Calculate AR stats
  const totalOutstanding = rows
    .filter((inv) => AR_STATUSES.includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const overdueAmount = rows
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const pendingCount = rows.filter((inv) =>
    AR_STATUSES.includes(inv.status)
  ).length;

  const arStats = [
    { label: "Total Outstanding", value: formatAUD(totalOutstanding), icon: DollarSign },
    { label: "Overdue", value: formatAUD(overdueAmount), icon: AlertTriangle },
    { label: "Pending", value: String(pendingCount), icon: Clock },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        <Button size="sm" className="min-h-[44px]">
          <Plus className="h-4 w-4 mr-1" />
          New Invoice
        </Button>
      </div>

      {/* AR Summary */}
      <div className="grid grid-cols-3 gap-3">
        {arStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <stat.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          className="pl-9 min-h-[44px]"
        />
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            No invoices found.
          </p>
        ) : (
          rows.map((invoice) => {
            const clientName =
              (invoice.clients as { name?: string } | null)?.name ??
              "Unknown Client";
            const formattedDate = invoice.date
              ? new Date(invoice.date).toLocaleDateString("en-AU")
              : "—";
            return (
              <Card
                key={invoice.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {invoice.invoice_number ?? `#${invoice.id.slice(0, 8)}`}
                        </span>
                        <Badge
                          variant="secondary"
                          className={statusStyles[invoice.status] ?? ""}
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {clientName} · {formattedDate}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">
                    {formatAUD(invoice.total ?? 0)}
                  </span>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
