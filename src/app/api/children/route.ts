import { NextResponse } from "next/server";
import { listChildren } from "@/lib/children";

export const runtime = "nodejs";

/**
 * Public (no PIN) on purpose: the child-facing "who's talking?" picker on the
 * main page needs this before any login happens. Only id+name are exposed -
 * level and timestamps are parent-only (see /api/parent/children).
 */
export async function GET() {
  const children = await listChildren();
  return NextResponse.json({ children: children.map((c) => ({ id: c.id, name: c.name })) });
}
