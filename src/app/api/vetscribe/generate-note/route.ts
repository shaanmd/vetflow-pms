import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface SoapNote {
  presenting_complaint: string;
  history: string;
  examination: string;
  diagnosis: string;
  treatment_plan: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    transcript: string;
    patientName?: string;
    patientSpecies?: string;
  };

  if (!body.transcript?.trim()) {
    return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
  }

  const transcript = body.transcript.slice(0, 8000);

  const systemPrompt = `You are a veterinary clinical notes assistant. You help veterinarians convert spoken narration into structured SOAP (Subjective, Objective, Assessment, Plan) clinical notes.

Extract information from the narration and return ONLY a valid JSON object with these exact keys:
- presenting_complaint: The main reason for the visit, as stated by the owner or vet
- history: Relevant medical history, previous treatments, owner-reported observations
- examination: Physical examination findings — vital signs, auscultation, palpation, gait, range of motion, etc.
- diagnosis: The working diagnosis, differential diagnoses, or assessment
- treatment_plan: Treatments administered, medications prescribed, home care instructions, follow-up plan

Rules:
- Use veterinary clinical language
- If information for a section is not present in the narration, use an empty string ""
- Do not invent or assume clinical details not present in the narration
- Keep sentences concise and factual
- Return ONLY the JSON object, no other text`;

  const userMessage = `Patient: ${body.patientName ?? "Unknown"} (${body.patientSpecies ?? "unknown species"})

Vet narration transcript:
${transcript}

Return the structured SOAP note as JSON.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt,
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Claude did not return valid JSON:", responseText);
      return NextResponse.json({ error: "Failed to parse generated note" }, { status: 500 });
    }

    const soapNote = JSON.parse(jsonMatch[0]) as SoapNote;

    const requiredKeys: (keyof SoapNote)[] = [
      "presenting_complaint", "history", "examination", "diagnosis", "treatment_plan"
    ];
    for (const key of requiredKeys) {
      if (typeof soapNote[key] !== "string") {
        soapNote[key] = "";
      }
    }

    return NextResponse.json({ note: soapNote });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Note generation failed";
    console.error("Claude SOAP generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
