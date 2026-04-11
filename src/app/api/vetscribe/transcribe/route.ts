import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  if (audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "Audio file exceeds 25MB limit" }, { status: 400 });
  }

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });

    return NextResponse.json({ transcript: transcription });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    console.error("Whisper transcription error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
