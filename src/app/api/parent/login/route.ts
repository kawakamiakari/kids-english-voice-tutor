import { NextRequest, NextResponse } from "next/server";
import { checkPin, createSessionToken, PARENT_SESSION_COOKIE } from "@/lib/parentAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body?.pin ?? "");

  const result = await checkPin(pin);
  if (!result.ok) {
    if (result.lockedForMs) {
      return NextResponse.json(
        { error: "locked", retryAfterMs: result.lockedForMs },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "invalid_pin" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PARENT_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour, matches SESSION_TTL_MS in lib/parentAuth.ts
  });
  return res;
}
