import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/tts";

// Needs Node.js APIs (Buffer), not the Edge runtime.
export const runtime = "nodejs";

/**
 * Generic text -> speech for pre-authored, fixed content (e.g. the EIKEN interview
 * script in lib/eikenContent.ts) where the browser already knows the exact English
 * text to speak and just needs audio for it - unlike /api/talk or /api/summary,
 * there is no model call here, just TTS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const audioBase64 = (await synthesizeSpeech(text)).toString("base64");
    return NextResponse.json({ audioBase64 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
