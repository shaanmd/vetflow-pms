"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { AppointmentRow } from "./actions";
import { saveConsultDraft, finaliseConsult } from "./consult-actions";
import { PrescriptionForm } from "./prescription-form";
import { RecordButton } from "@/components/vetscribe/record-button";
import { TranscriptReview } from "@/components/vetscribe/transcript-review";

interface ConsultNoteFormProps {
  appointment: AppointmentRow;
  onSaved: () => void;
  onClose: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ConsultNoteForm({ appointment, onSaved, onClose }: ConsultNoteFormProps) {
  const [consultDate, setConsultDate] = useState(
    appointment.consult_date ?? appointment.date
  );
  const [presentingComplaint, setPresentingComplaint] = useState(
    appointment.presenting_complaint ?? ""
  );
  const [history, setHistory] = useState(appointment.history ?? "");
  const [examination, setExamination] = useState(appointment.examination ?? "");
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis ?? "");
  const [treatmentPlan, setTreatmentPlan] = useState(appointment.treatment_plan ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [finalising, setFinalising] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftData = useCallback(() => ({
    consult_date: consultDate,
    presenting_complaint: presentingComplaint,
    history,
    examination,
    diagnosis,
    treatment_plan: treatmentPlan,
  }), [consultDate, presentingComplaint, history, examination, diagnosis, treatmentPlan]);

  function handleTranscriptReady(transcript: string) {
    setPendingTranscript(transcript);
  }

  function handleNoteAccepted(
    note: {
      presenting_complaint: string;
      history: string;
      examination: string;
      diagnosis: string;
      treatment_plan: string;
    },
    rawTranscript: string
  ) {
    // Only fill fields that are currently empty
    if (!presentingComplaint.trim()) setPresentingComplaint(note.presenting_complaint);
    if (!history.trim()) setHistory(note.history);
    if (!examination.trim()) setExamination(note.examination);
    if (!diagnosis.trim()) setDiagnosis(note.diagnosis);
    if (!treatmentPlan.trim()) setTreatmentPlan(note.treatment_plan);

    // Store transcript + AI output immediately (regulatory requirement SC-11)
    saveConsultDraft(appointment.id, {
      consult_date: consultDate,
      presenting_complaint: note.presenting_complaint || presentingComplaint,
      history: note.history || history,
      examination: note.examination || examination,
      diagnosis: note.diagnosis || diagnosis,
      treatment_plan: note.treatment_plan || treatmentPlan,
      notes_transcript: rawTranscript,
      notes_ai_generated: JSON.stringify(note),
    });

    setPendingTranscript(null);
    toast.success("SOAP note generated — review and edit before finalising");
  }

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSaveState("saving");
      const result = await saveConsultDraft(appointment.id, draftData());
      setSaveState(result.error ? "error" : "saved");
      if (!result.error) onSaved();
      setTimeout(() => setSaveState("idle"), 2000);
    }, 1500);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultDate, presentingComplaint, history, examination, diagnosis, treatmentPlan]);

  async function handleFinalise() {
    setFinalising(true);
    const result = await finaliseConsult(appointment.id, draftData());
    if (result.error) {
      toast.error(result.error);
      setFinalising(false);
      return;
    }
    toast.success("Consult finalised");
    onSaved();
    onClose();
  }

  const savingIndicator =
    saveState === "saving" ? (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    ) : saveState === "saved" ? (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Saved
      </span>
    ) : saveState === "error" ? (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Save failed
      </span>
    ) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* VetScribe */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              VetScribe
            </Label>
            <RecordButton
              onTranscriptReady={handleTranscriptReady}
              onError={(msg) => toast.error(msg)}
              disabled={pendingTranscript !== null}
            />
          </div>

          {pendingTranscript !== null && (
            <TranscriptReview
              transcript={pendingTranscript}
              patientName={appointment.patient?.name ?? ""}
              patientSpecies={appointment.patient?.species ?? ""}
              onAccept={handleNoteAccepted}
              onDiscard={() => setPendingTranscript(null)}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="consult-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Consult Date
          </Label>
          <Input
            id="consult-date"
            type="date"
            value={consultDate}
            onChange={(e) => setConsultDate(e.target.value)}
            className="min-h-[44px]"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="presenting-complaint" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Presenting Complaint
          </Label>
          <Textarea
            id="presenting-complaint"
            value={presentingComplaint}
            onChange={(e) => setPresentingComplaint(e.target.value)}
            placeholder="Why is the patient here today?"
            className="min-h-[80px] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="history" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            History
          </Label>
          <Textarea
            id="history"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Relevant medical history, owner observations…"
            className="min-h-[80px] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="examination" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Examination
          </Label>
          <Textarea
            id="examination"
            value={examination}
            onChange={(e) => setExamination(e.target.value)}
            placeholder="Physical examination findings…"
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="diagnosis" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Diagnosis / Assessment
          </Label>
          <Textarea
            id="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Diagnosis or differential diagnoses…"
            className="min-h-[80px] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="treatment-plan" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Treatment Plan
          </Label>
          <Textarea
            id="treatment-plan"
            value={treatmentPlan}
            onChange={(e) => setTreatmentPlan(e.target.value)}
            placeholder="Treatment administered, medications, follow-up instructions…"
            className="min-h-[100px] resize-none"
          />
        </div>

        <PrescriptionForm appointmentId={appointment.id} patientId={appointment.patient?.id ?? ""} />

      </div>

      <div className="shrink-0 border-t px-4 py-3 flex items-center justify-between gap-3 bg-background">
        {savingIndicator ?? <span />}
        <Button
          onClick={handleFinalise}
          disabled={finalising}
          className="min-h-[44px]"
        >
          {finalising && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Finalise Consult
        </Button>
      </div>
    </div>
  );
}
