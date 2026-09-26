import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { SUMMARY_PROMPT, SUMMARY_SCHEMA, CHAT_MODEL, TTS_MODEL, TTS_VOICE } from "@/lib/systemPrompt";

// Needs Node.js APIs (Buffer), not the Edge runtime.
export const runtime = "nodejs";

type TranscriptMessage = { role: "child" | "pico"; text: string };

type SummaryReply = {
  headline: string;
  points: { kind: "praise" | "tip"; text: string }[];
};

const FALLBACK_SUMMARY: SummaryReply = {
  headline: "Great job practicing English today!",
  points: [
    { kind: "praise", text: "You talked with Pico today!" },
    { kind: "tip", text: "またこんど おはなし しようね" },
    { kind: "tip", text: "すきな どうぶつを おしえてね" },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript: TranscriptMessage[] = Array.isArray(body?.transcript) ? body.transcript : [];

    let parsed = FALLBACK_SUMMARY;

    if (transcript.length > 0) {
      const transcriptText = transcript
        .map((m) => `${m.role === "child" ? "Student" : "Pico"}: ${m.text}`)
        .join("\n");

      const response = await openai.responses.create({
        model: CHAT_MODEL,
        input: [
          { role: "system", content: SUMMARY_PROMPT },
          { role: "user", content: transcriptText },
        ],
        text: { format: { type: "json_schema", ...SUMMARY_SCHEMA } },
      });

      try {
        parsed = JSON.parse(response.output_text) as SummaryReply;
      } catch {
        parsed = FALLBACK_SUMMARY;
      }
    }

    const spokenText = [parsed.headline, ...parsed.points.map((p) => p.text)].join(" ");
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: spokenText,
    });
    const audioBase64 = Buffer.from(await speech.arrayBuffer()).toString("base64");

    return NextResponse.json({ ...parsed, audioBase64 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
