"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getClientsForPractice,
  getProductsForPractice,
  createInvoice,
  type ClientOption,
  type ProductOption,
} from "./invoice-actions";

interface LineItem {
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

function formatAUD(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 10 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getClientsForPractice(), getProductsForPractice()]).then(
      ([c, p]) => { setClients(c); setProducts(p); }
    );
  }, []);

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      { product_id: null, description: "", quantity: 1, unit_price: 0, tax_rate: 10 },
    ]);
  }

  function removeLineItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number | null) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setLineItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              product_id: product.id,
              description: product.name,
              unit_price: product.price,
              tax_rate: product.tax_rate,
            }
          : item
      )
    );
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unit_price * item.tax_rate) / 100,
    0
  );
  const total = subtotal + taxAmount;

  async function handleSave() {
    if (!selectedClient) { toast.error("Select a client"); return; }
    const hasEmptyDescriptions = lineItems.some((i) => !i.description.trim());
    if (hasEmptyDescriptions) { toast.error("All line items need a description"); return; }

    setSaving(true);
    const result = await createInvoice(selectedClient, lineItems, null);
    setSaving(false);

    if (result.error && !result.invoiceId) {
      toast.error(result.error);
      return;
    }
    if (result.error) {
      toast.warning(result.error);
    } else {
      toast.success("Invoice created");
    }
    router.push(`/invoices/${result.invoiceId}`);
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">New Invoice</h1>
      </div>

      {/* Client */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClient} onValueChange={(v) => setSelectedClient(v ?? "")}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Select client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.email && ` — ${c.email}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Line Items</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={addLineItem} className="h-7 px-2">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <Select
                value={item.product_id ?? ""}
                onValueChange={(v) => v && selectProduct(index, v)}
              >
                <SelectTrigger className="min-h-[40px]">
                  <SelectValue placeholder="Pick a service/product (or type below)..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatAUD(p.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={item.description}
                onChange={(e) => updateLineItem(index, "description", e.target.value)}
                placeholder="Description"
                className="min-h-[40px]"
              />

              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                    className="min-h-[40px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                    className="min-h-[40px]"
                  />
                </div>
                <div className="flex items-end gap-1">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">GST %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.tax_rate}
                      onChange={(e) => updateLineItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                      className="min-h-[40px]"
                    />
                  </div>
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-destructive shrink-0"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-right text-sm font-medium">
                {formatAUD(item.quantity * item.unit_price * (1 + item.tax_rate / 100))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatAUD(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST</span>
            <span>{formatAUD(taxAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>{formatAUD(total)}</span>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full min-h-[48px]"
        onClick={handleSave}
        disabled={saving}
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Create Invoice
      </Button>
    </div>
  );
}
