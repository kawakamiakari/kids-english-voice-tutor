import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { TRANSCRIBE_MODEL } from "@/lib/systemPrompt";
import { isFlagged } from "@/lib/moderation";
import { recordFlagEvent } from "@/lib/flagEvents";

// Needs Node.js APIs (Buffer, File), not the Edge runtime.
export const runtime = "nodejs";

/**
 * Transcribes + moderates one recorded answer during a scripted EIKEN mock
 * interview (see hooks/useEikenInterview.ts). Unlike /api/talk, there is no
 * chat-model call here: the next question is fixed, pre-authored content, so
 * this route only needs to turn speech into text and check it's safe.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const childId = String(form.get("childId") ?? "");

    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const audioFile = new File([await audio.arrayBuffer()], "speech.webm", {
      type: audio.type || "audio/webm",
    });
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIBE_MODEL,
    });
    const text = transcription.text?.trim() ?? "";

    const flagged = text.length > 0 && (await isFlagged(text));
    if (flagged && childId) {
      await recordFlagEvent(childId, text, "えいけんれんしゅう中に、はんいがいのはつげんをけんちしました");
    }

    return NextResponse.json({ text, flagged });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
