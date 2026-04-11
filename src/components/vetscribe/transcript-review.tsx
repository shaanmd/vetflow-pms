"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, X } from "lucide-react";

interface SoapNote {
  presenting_complaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  treatment_plan: string;
}

interface TranscriptReviewProps {
  transcript: string;
  patientName: string;
  patientSpecies: string;
  onAccept: (note: SoapNote, transcript: string) => void;
  onDiscard: () => void;
}

export function TranscriptReview({
  transcript,
  patientName,
  patientSpecies,
  onAccept,
  onDiscard,
}: TranscriptReviewProps) {
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/vetscribe/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: editedTranscript,
          patientName,
          patientSpecies,
        }),
      });

      const data = await response.json() as { note?: SoapNote; error?: string };

      if (!response.ok || data.error) {
        setError(data.error ?? "Failed to generate note");
        setGenerating(false);
        return;
      }

      if (data.note) {
        onAccept(data.note, editedTranscript);
      }
    } catch {
      setError("Failed to connect to note generation service");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Transcript — Review & Edit
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onDiscard}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Textarea
        value={editedTranscript}
        onChange={(e) => setEditedTranscript(e.target.value)}
        className="min-h-[120px] resize-none text-sm font-mono"
        placeholder="Transcript will appear here…"
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        type="button"
        size="sm"
        className="w-full min-h-[40px]"
        onClick={handleGenerate}
        disabled={generating || !editedTranscript.trim()}
      >
        {generating ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Generating note…</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5 mr-2" />Generate SOAP Note</>
        )}
      </Button>
    </div>
  );
}
