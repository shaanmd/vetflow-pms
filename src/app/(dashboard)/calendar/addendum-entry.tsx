"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addConsultAddendum } from "./consult-actions";

interface AddendumEntryProps {
  appointmentId: string;
  onSaved: () => void;
}

export function AddendumEntry({ appointmentId, onSaved }: AddendumEntryProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setSaving(true);
    const result = await addConsultAddendum(appointmentId, content);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Addendum added");
    setContent("");
    onSaved();
  }

  return (
    <div className="border-t px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Add Addendum
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Record a correction, follow-up note, or additional finding…"
        className="min-h-[80px] resize-none text-sm"
      />
      <Button
        size="sm"
        className="w-full min-h-[44px]"
        onClick={handleSubmit}
        disabled={saving || !content.trim()}
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
        Save Addendum
      </Button>
    </div>
  );
}
