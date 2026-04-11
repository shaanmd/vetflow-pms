"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { AppointmentRow } from "./actions";
import { ConsultNoteForm } from "./consult-note-form";
import { AddendumEntry } from "./addendum-entry";

const speciesEmoji: Record<string, string> = {
  dog: "🐕",
  cat: "🐈",
  horse: "🐴",
  other: "🐾",
};

interface ConsultSheetProps {
  appointment: AppointmentRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function ConsultSheet({ appointment, open, onClose, onSaved }: ConsultSheetProps) {
  if (!appointment) return null;

  const patient = appointment.patient;
  const client = appointment.client;
  const isFinalised = appointment.clinical_status === "finalised";
  const allergies = (patient?.allergies as string[] | null) ?? [];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] flex flex-col p-0"
      >
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                {patient && (
                  <span aria-hidden="true">
                    {speciesEmoji[patient.species] ?? speciesEmoji.other}
                  </span>
                )}
                {patient?.name ?? "Unknown patient"}
                {isFinalised && (
                  <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800">
                    Finalised
                  </Badge>
                )}
                {appointment.clinical_status === "draft" && (
                  <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800">
                    Draft
                  </Badge>
                )}
              </SheetTitle>
              {client && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {client.name}
                  {client.phone && ` · ${client.phone}`}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground shrink-0 text-right">
              {new Date(appointment.date).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              <br />
              {appointment.start_time.slice(0, 5)}
            </p>
          </div>

          {allergies.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="text-xs font-medium text-destructive">Allergies:</span>
              {allergies.map((a) => (
                <Badge key={a} variant="destructive" className="text-[10px]">{a}</Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isFinalised ? (
            <div className="space-y-0">
              <ReadOnlyConsult appointment={appointment} />
              <AddendumEntry appointmentId={appointment.id} onSaved={onSaved} />
            </div>
          ) : (
            <ConsultNoteForm
              appointment={appointment}
              onSaved={onSaved}
              onClose={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ReadOnlyConsult({ appointment }: { appointment: AppointmentRow }) {
  const fields: { label: string; value: string | null | undefined }[] = [
    { label: "Presenting Complaint", value: appointment.presenting_complaint },
    { label: "History", value: appointment.history },
    { label: "Examination", value: appointment.examination },
    { label: "Diagnosis", value: appointment.diagnosis },
    { label: "Treatment Plan", value: appointment.treatment_plan },
  ];

  return (
    <div className="divide-y">
      {fields.map(({ label, value }) => (
        <div key={label} className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          {value ? (
            <p className="text-sm whitespace-pre-wrap">{value}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not recorded</p>
          )}
        </div>
      ))}
    </div>
  );
}
