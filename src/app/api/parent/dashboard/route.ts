import { NextRequest, NextResponse } from "next/server";
import { isParentAuthorized } from "@/lib/parentAuth";
import { getTotalUsedSecondsToday } from "@/lib/usageLimiter";
import { listTodaySummaries } from "@/lib/summaryStore";
import { listTodayFlagEvents } from "@/lib/flagEvents";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isParentAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [usedSeconds, summaries, flagEvents] = await Promise.all([
    getTotalUsedSecondsToday(),
    listTodaySummaries(),
    listTodayFlagEvents(),
  ]);

  return NextResponse.json({
    usedSeconds,
    limitMinutes: Number(process.env.DAILY_LIMIT_MINUTES ?? 15),
    summaries,
    flagEvents,
  });
}
