import { NextRequest, NextResponse } from "next/server";
import { isParentAuthorized } from "@/lib/parentAuth";
import { resetUsageForChild } from "@/lib/usageLimiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const childId = String(body?.childId ?? "");
  if (!childId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  await resetUsageForChild(childId);
  return NextResponse.json({ ok: true });
}
