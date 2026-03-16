"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  getUnbilledAppointments,
  getPracticeProducts,
  getNextInvoiceNumber,
  createInvoice,
  type UnbilledAppointment,
  type PracticeProduct,
} from "../actions";

// ── Helpers ──────────────────────────────────────────────────

function formatAUD(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Line item type ───────────────────────────────────────────

type LineItem = {
  key: number;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

function lineTotal(item: LineItem): number {
  return item.quantity * item.unit_price;
}

// ── Component ────────────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();

  // Data from server
  const [appointments, setAppointments] = useState<UnbilledAppointment[]>([]);
  const [products, setProducts] = useState<PracticeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 14));
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Derived from selected appointment
  const selectedAppointment = appointments.find(
    (a) => a.id === selectedAppointmentId
  );
  const clientName = selectedAppointment?.client?.name ?? "";
  const vetName = selectedAppointment?.vet?.name ?? "";

  // Key counter for line items
  const [nextKey, setNextKey] = useState(1);

  // ── Load data ────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const appts = await getUnbilledAppointments();
        setAppointments(appts);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // When appointment changes, load products and invoice number
  const handleAppointmentChange = useCallback(
    async (appointmentId: string) => {
      setSelectedAppointmentId(appointmentId);
      setLineItems([]);
      setNextKey(1);

      const appt = appointments.find((a) => a.id === appointmentId);
      if (!appt) return;

      try {
        const [prods, invNum] = await Promise.all([
          getPracticeProducts(appt.practice_id),
          getNextInvoiceNumber(appt.practice_id),
        ]);
        setProducts(prods);
        setInvoiceNumber(invNum);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load practice data");
      }
    },
    [appointments]
  );

  // ── Line item operations ─────────────────────────────────

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      {
        key: nextKey,
        product_id: null,
        description: "",
        quantity: 1,
        unit_price: 0,
        tax_rate: 10,
      },
    ]);
    setNextKey((k) => k + 1);
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateLineItem(key: number, updates: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...updates } : item))
    );
  }

  function handleProductSelect(key: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateLineItem(key, {
      product_id: product.id,
      description: product.name,
      unit_price: product.price,
      tax_rate: product.tax_rate,
    });
  }

  // ── Totals ───────────────────────────────────────────────

  const subtotal = lineItems.reduce((sum, item) => sum + lineTotal(item), 0);
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + lineTotal(item) * (item.tax_rate / 100),
    0
  );
  const total = subtotal + taxAmount;

  // ── Submit ───────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedAppointment) {
      toast.error("Please select an appointment");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    if (lineItems.some((item) => !item.description.trim())) {
      toast.error("All line items must have a description");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createInvoice({
        practice_id: selectedAppointment.practice_id,
        client_id: selectedAppointment.client_id,
        appointment_id: selectedAppointment.id,
        performing_vet_id: selectedAppointment.vet_id,
        invoice_number: invoiceNumber,
        date,
        due_date: dueDate,
        subtotal: Math.round(subtotal * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        line_items: lineItems.map((item, idx) => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: Math.round(lineTotal(item) * 100) / 100,
          sort_order: idx,
        })),
      });

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Invoice created successfully");
        router.push("/invoices");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/invoices">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
      </div>

      {/* Appointment selector */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Select completed appointment</Label>
            <Select
              value={selectedAppointmentId}
              onValueChange={(val) => val && handleAppointmentChange(val)}
            >
              <SelectTrigger className="w-full min-h-[44px]">
                <SelectValue placeholder="Choose an appointment..." />
              </SelectTrigger>
              <SelectContent>
                {appointments.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No unbilled appointments
                  </SelectItem>
                ) : (
                  appointments.map((appt) => {
                    const apptDate = new Date(appt.date).toLocaleDateString(
                      "en-AU"
                    );
                    const patientName = appt.patient?.name ?? "Unknown";
                    const label = `${apptDate} - ${patientName} (${appt.appointment_type_id})`;
                    return (
                      <SelectItem key={appt.id} value={appt.id}>
                        {label}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedAppointment && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Client:</span>{" "}
                <span className="font-medium">{clientName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Vet:</span>{" "}
                <span className="font-medium">{vetName}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice details */}
      {selectedAppointment && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice-number">Invoice Number</Label>
                  <Input
                    id="invoice-number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-date">Date</Label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice-due">Due Date</Label>
                  <Input
                    id="invoice-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No items added yet. Click &quot;Add Item&quot; to start.
                </p>
              )}

              {lineItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-lg border p-3 space-y-3"
                >
                  {/* Product picker */}
                  <div className="space-y-2">
                    <Label>Product / Service</Label>
                    <Select
                      value={item.product_id ?? ""}
                      onValueChange={(val) =>
                        val && handleProductSelect(item.key, val)
                      }
                    >
                      <SelectTrigger className="w-full min-h-[44px]">
                        <SelectValue placeholder="Pick a product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((prod) => (
                          <SelectItem key={prod.id} value={prod.id}>
                            {prod.name} — {formatAUD(prod.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.key, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Item description"
                      className="min-h-[44px]"
                    />
                  </div>

                  {/* Qty + Price + Remove */}
                  <div className="grid grid-cols-[1fr_1fr_44px] gap-2 items-end">
                    <div className="space-y-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.key, {
                            quantity: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price}
                        onChange={(e) =>
                          updateLineItem(item.key, {
                            unit_price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="min-h-[44px]"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.key)}
                      className="min-h-[44px] min-w-[44px] text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Line total */}
                  <div className="text-right text-sm text-muted-foreground">
                    Line total: {formatAUD(lineTotal(item))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Totals + Submit */}
          <Card>
            <CardContent className="space-y-2 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatAUD(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (10%)</span>
                <span>{formatAUD(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total</span>
                <span>{formatAUD(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full min-h-[44px]"
            onClick={handleSubmit}
            disabled={submitting || lineItems.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </>
      )}
    </div>
  );
}
