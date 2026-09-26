import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import {
  SYSTEM_PROMPT,
  REPLY_SCHEMA,
  SAFE_FALLBACK_REPLY,
  CHAT_MODEL,
  TRANSCRIBE_MODEL,
  TTS_MODEL,
  TTS_VOICE,
} from "@/lib/systemPrompt";
import { isFlagged } from "@/lib/moderation";
import { getHistory, appendTurn } from "@/lib/sessionStore";
import { isOverDailyLimit, addUsedSeconds } from "@/lib/usageLimiter";

// Needs Node.js APIs (Buffer, File), not the Edge runtime.
export const runtime = "nodejs";

type ModelReply = {
  reply_en: string;
  off_topic_attempt: boolean;
  flag_reason: string;
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const sessionId = String(form.get("sessionId") ?? "");
    const clientSeconds = Number(form.get("seconds") ?? 5);

    if (!(audio instanceof Blob) || !sessionId) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    // 1) Parental daily time limit (see lib/usageLimiter.ts for its MVP caveats).
    if (await isOverDailyLimit(sessionId)) {
      return NextResponse.json({ error: "daily_limit_reached" }, { status: 403 });
    }

    // 2) Speech -> text. We never write the audio to disk; it only exists in
    //    memory for the duration of this request.
    const audioFile = new File([await audio.arrayBuffer()], "speech.webm", {
      type: audio.type || "audio/webm",
    });
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: TRANSCRIBE_MODEL,
    });
    const childText = transcription.text?.trim() ?? "";

    // 3) Moderate the CHILD'S OWN words before they ever reach the tutor model.
    if (childText && (await isFlagged(childText))) {
      const audioBase64 = (await synthesize(SAFE_FALLBACK_REPLY)).toString("base64");
      await addUsedSeconds(sessionId, clientSeconds);
      return NextResponse.json({
        childText,
        aiText: SAFE_FALLBACK_REPLY,
        audioBase64,
        flagged: true,
      });
    }

    // 4) Ask the model for a reply. The fixed SYSTEM_PROMPT is added on every
    //    single call from the server; the browser has no way to see or edit it,
    //    and no tools (web search / image generation / code execution) are
    //    attached, so the model has no technical means to do those things even
    //    if asked.
    const history = await getHistory(sessionId);
    const response = await openai.responses.create({
      model: CHAT_MODEL,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: "user", content: childText || "(no speech detected)" },
      ],
      text: { format: { type: "json_schema", ...REPLY_SCHEMA } },
    });

    // NOTE: `output_text` is the SDK convenience accessor that concatenates the
    // model's text output. Check your installed `openai` package version if this
    // shape has changed - Structured Outputs on the Responses API is a fast-moving
    // part of the API surface.
    let parsed: ModelReply;
    try {
      parsed = JSON.parse(response.output_text) as ModelReply;
    } catch {
      parsed = { reply_en: SAFE_FALLBACK_REPLY, off_topic_attempt: false, flag_reason: "" };
    }

    let aiText = parsed.reply_en?.trim() || SAFE_FALLBACK_REPLY;

    // 5) Moderate the MODEL'S OWN reply before it is ever spoken aloud.
    if (await isFlagged(aiText)) {
      aiText = SAFE_FALLBACK_REPLY;
    }

    // 6) Short-term memory for natural follow-up questions, plus a hook for a
    //    future parent-facing log of off-topic attempts.
    await appendTurn(sessionId, { role: "user", content: childText });
    await appendTurn(sessionId, { role: "assistant", content: aiText });
    await addUsedSeconds(sessionId, clientSeconds);

    if (parsed.off_topic_attempt) {
      // TODO: persist { sessionId, childText, reason: parsed.flag_reason, at: Date.now() }
      // to a real store once you build the parent dashboard. For the MVP we just log it.
      console.log(`[off-topic attempt] session=${sessionId} reason=${parsed.flag_reason}`);
    }

    // 7) Text -> speech.
    const audioBase64 = (await synthesize(aiText)).toString("base64");

    return NextResponse.json({ childText, aiText, audioBase64, flagged: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function synthesize(text: string): Promise<Buffer> {
  const speech = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
  });
  return Buffer.from(await speech.arrayBuffer());
}
