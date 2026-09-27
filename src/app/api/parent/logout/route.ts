import { NextResponse } from "next/server";
import { PARENT_SESSION_COOKIE } from "@/lib/parentAuth";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PARENT_SESSION_COOKIE);
  return res;
}
