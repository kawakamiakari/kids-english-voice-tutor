import { NextRequest, NextResponse } from "next/server";
import { isParentAuthorized } from "@/lib/parentAuth";
import { listChildren, createChild, type Level } from "@/lib/children";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ children: await listChildren() });
}

export async function POST(req: NextRequest) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const level = Number(body?.level);

  if (!name || ![1, 2, 3].includes(level)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const child = await createChild(name, level as Level);
  return NextResponse.json({ child });
}
