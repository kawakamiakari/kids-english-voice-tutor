import { NextRequest, NextResponse } from "next/server";
import { isParentAuthorized } from "@/lib/parentAuth";
import { listChildren } from "@/lib/children";
import { getUsedSeconds } from "@/lib/usageLimiter";
import { listTodaySummaries } from "@/lib/summaryStore";
import { listTodayFlagEvents } from "@/lib/flagEvents";
import { listTodayEikenResults } from "@/lib/eikenResults";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const children = await listChildren();
  const breakdown = await Promise.all(
    children.map(async (child) => ({
      id: child.id,
      name: child.name,
      level: child.level,
      usedSeconds: await getUsedSeconds(child.id),
      summaries: await listTodaySummaries(child.id),
      flagEvents: await listTodayFlagEvents(child.id),
      eikenResults: await listTodayEikenResults(child.id),
    }))
  );

  return NextResponse.json({
    limitMinutes: Number(process.env.DAILY_LIMIT_MINUTES ?? 15),
    children: breakdown,
  });
}
