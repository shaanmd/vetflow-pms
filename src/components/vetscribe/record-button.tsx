"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecordState = "idle" | "recording" | "processing";

interface RecordButtonProps {
  onTranscriptReady: (transcript: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function RecordButton({ onTranscriptReady, onError, disabled }: RecordButtonProps) {
  const [state, setState] = useState<RecordState>("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setState("processing");
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "narration.webm");

        try {
          const response = await fetch("/api/vetscribe/transcribe", {
            method: "POST",
            body: formData,
          });
          const data = await response.json() as { transcript?: string; error?: string };

          if (!response.ok || data.error) {
            onError(data.error ?? "Transcription failed");
            setState("idle");
            return;
          }

          onTranscriptReady(data.transcript ?? "");
          setState("idle");
          setSeconds(0);
        } catch {
          onError("Failed to connect to transcription service");
          setState("idle");
        }
      };

      mediaRecorder.start(1000);
      setState("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 599) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microphone access denied";
      onError(message);
    }
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-sm text-red-600 font-medium tabular-nums">
          {formatTime(seconds)}
        </span>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="min-h-[40px]"
          onClick={stopRecording}
        >
          <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />
          Stop
        </Button>
      </div>
    );
  }

  if (state === "processing") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Transcribing…
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-[40px] gap-1.5"
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="h-3.5 w-3.5" />
      Record
    </Button>
  );
}
