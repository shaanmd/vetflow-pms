import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, AlertTriangle, DollarSign, Clock } from "lucide-react";

// TODO: Replace with real data
const arStats = [
  { label: "Total Outstanding", value: "$3,250", icon: DollarSign },
  { label: "Overdue", value: "$850", icon: AlertTriangle },
  { label: "Pending", value: "5", icon: Clock },
];

const mockInvoices = [
  { id: "1", number: "SM-0042", date: "2026-03-14", client: "Mike O'Brien", total: "$450.00", status: "sent" },
  { id: "2", number: "SM-0041", date: "2026-03-13", client: "Jane Smith", total: "$350.00", status: "paid" },
  { id: "3", number: "SR-0018", date: "2026-03-12", client: "Sarah Johnson", total: "$185.00", status: "overdue" },
  { id: "4", number: "SM-0040", date: "2026-03-10", client: "Tom Richards", total: "$650.00", status: "paid" },
  { id: "5", number: "SR-0017", date: "2026-03-08", client: "Lisa Chen", total: "$120.00", status: "draft" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
};

export default function InvoicesPage() {
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
        {mockInvoices.map((invoice) => (
          <Card key={invoice.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {invoice.number}
                    </span>
                    <Badge variant="secondary" className={statusStyles[invoice.status]}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {invoice.client} · {invoice.date}
                  </p>
                </div>
              </div>
              <span className="font-semibold text-sm">{invoice.total}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
