import { NextRequest, NextResponse } from "next/server";
import { isParentAuthorized } from "@/lib/parentAuth";
import { resetTodayUsage } from "@/lib/usageLimiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await resetTodayUsage();
  return NextResponse.json({ ok: true });
}
