import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { buildEikenFeedbackPrompt, SUMMARY_SCHEMA, CHAT_MODEL } from "@/lib/systemPrompt";
import { synthesizeSpeech } from "@/lib/tts";
import { saveEikenResult, type EikenStep } from "@/lib/eikenResults";

// Needs Node.js APIs (Buffer), not the Edge runtime.
export const runtime = "nodejs";

type FeedbackReply = {
  headline: string;
  points: { kind: "praise" | "tip"; text: string }[];
};

const FALLBACK: FeedbackReply = {
  headline: "Great job practicing the interview today!",
  points: [
    { kind: "praise", text: "げんきに こたえられたね" },
    { kind: "tip", text: "つぎは もっと ながい \"I like...\" の文で こたえてみよう" },
    { kind: "tip", text: "つぎは もうすこし ゆっくり はなしてみよう" },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const childId = String(body?.childId ?? "");
    const grade = String(body?.grade ?? "3");
    const steps: EikenStep[] = Array.isArray(body?.steps) ? body.steps : [];

    let parsed = FALLBACK;

    if (steps.length > 0) {
      const transcriptText = steps
        .map((s, i) => `Q${i + 1}: ${s.prompt}\nA${i + 1}: ${s.answer || "(no answer)"}`)
        .join("\n\n");

      const response = await openai.responses.create({
        model: CHAT_MODEL,
        input: [
          { role: "system", content: buildEikenFeedbackPrompt() },
          { role: "user", content: transcriptText },
        ],
        text: { format: { type: "json_schema", ...SUMMARY_SCHEMA } },
      });

      try {
        parsed = JSON.parse(response.output_text) as FeedbackReply;
      } catch {
        parsed = FALLBACK;
      }
    }

    if (steps.length > 0 && childId) {
      await saveEikenResult(childId, grade, steps, parsed.headline, parsed.points);
    }

    const spokenText = [parsed.headline, ...parsed.points.map((p) => p.text)].join(" ");
    const audioBase64 = (await synthesizeSpeech(spokenText)).toString("base64");

    return NextResponse.json({ ...parsed, audioBase64 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
