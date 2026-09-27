import { openai } from "./openai";
import { TTS_MODEL, TTS_VOICE } from "./systemPrompt";

/** Shared by every route that turns text into spoken audio (talk, summary, eiken). */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const speech = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
  });
  return Buffer.from(await speech.arrayBuffer());
}
