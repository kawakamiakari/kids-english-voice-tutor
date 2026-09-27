import { NextRequest, NextResponse } from "next/server";
import { isParentAuthorized } from "@/lib/parentAuth";
import { deleteChild } from "@/lib/children";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await deleteChild(id);
  return NextResponse.json({ ok: true });
}
