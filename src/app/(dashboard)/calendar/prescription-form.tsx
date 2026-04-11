"use client";

import { useState, useEffect } from "react";
import { Plus, ChevronUp, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getPrescriptions, createPrescription, type PrescriptionRow } from "./prescription-actions";
import type { DrugSchedule } from "@/types/database";

interface PrescriptionFormProps {
  appointmentId: string;
  patientId: string;
}

const SCHEDULE_OPTIONS: { value: DrugSchedule; label: string }[] = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "S2", label: "S2" },
  { value: "S3", label: "S3" },
  { value: "S4", label: "S4 — Prescription Only" },
  { value: "S8", label: "S8 — Controlled Drug" },
];

export function PrescriptionForm({ appointmentId, patientId }: PrescriptionFormProps) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [quantity, setQuantity] = useState("");
  const [instructions, setInstructions] = useState("");
  const [schedule, setSchedule] = useState<DrugSchedule>("unscheduled");
  const [batchNumber, setBatchNumber] = useState("");

  useEffect(() => {
    getPrescriptions(appointmentId).then(setPrescriptions);
  }, [appointmentId]);

  function resetForm() {
    setMedication(""); setDose(""); setFrequency(""); setDuration("");
    setQuantity(""); setInstructions(""); setSchedule("unscheduled"); setBatchNumber("");
    setShowAdd(false);
  }

  async function handleAdd() {
    if (!medication.trim()) {
      toast.error("Medication name is required");
      return;
    }
    setSaving(true);
    const result = await createPrescription(appointmentId, patientId, {
      medication, dose, frequency, duration, quantity, instructions,
      schedule: schedule === "unscheduled" ? null : schedule,
      batch_number: batchNumber,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Prescription added");
    const updated = await getPrescriptions(appointmentId);
    setPrescriptions(updated);
    resetForm();
  }

  const isControlled = schedule === "S4" || schedule === "S8";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Pill className="h-3.5 w-3.5" />
          Prescriptions {prescriptions.length > 0 && `(${prescriptions.length})`}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setShowAdd((v) => !v)}
        >
          {showAdd ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {prescriptions.length > 0 && (
        <ul className="space-y-1.5">
          {prescriptions.map((rx) => (
            <li key={rx.id} className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{rx.medication}</p>
                  <p className="text-xs text-muted-foreground">
                    {[rx.dose, rx.frequency, rx.duration].filter(Boolean).join(" · ")}
                    {rx.quantity && ` — Qty: ${rx.quantity}`}
                  </p>
                  {rx.instructions && (
                    <p className="text-xs text-muted-foreground mt-0.5">{rx.instructions}</p>
                  )}
                </div>
                {rx.schedule && rx.schedule !== "unscheduled" && (
                  <Badge
                    variant={rx.schedule === "S8" ? "destructive" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {rx.schedule}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="rounded-md border bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Medication *</Label>
              <Input
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                placeholder="Drug name"
                className="min-h-[40px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dose</Label>
              <Input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 10mg" className="min-h-[40px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Frequency</Label>
              <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} placeholder="e.g. BID" className="min-h-[40px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Duration</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 7 days" className="min-h-[40px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quantity</Label>
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 14 tablets" className="min-h-[40px]" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Schedule</Label>
              <Select value={schedule} onValueChange={(v) => setSchedule(v as DrugSchedule)}>
                <SelectTrigger className="min-h-[40px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isControlled && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Batch Number <span className="text-destructive">*</span></Label>
                <Input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Required for S4/S8"
                  className="min-h-[40px] border-amber-300"
                />
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Instructions to Owner</Label>
              <Input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Give with food"
                className="min-h-[40px]"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full min-h-[40px]"
            onClick={handleAdd}
            disabled={saving}
          >
            {saving ? "Adding…" : "Add Prescription"}
          </Button>
        </div>
      )}
    </div>
  );
}
