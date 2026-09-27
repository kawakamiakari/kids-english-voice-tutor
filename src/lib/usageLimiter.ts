import { getDb } from "./db";

/**
 * Tracks total conversation seconds per day, per sessionId. Persisted (see
 * lib/db.ts) so it survives server restarts and works across serverless
 * invocations - unlike a plain in-memory Map, which resets whenever the
 * process does.
 *
 * Caveat: still keyed by a per-browser-tab sessionId, not a stable per-child
 * ID, so a child could reset their own limit by switching tabs/clearing
 * storage. Fine for the MVP's "one honest family" trust model; revisit once
 * a real parent/child identity model exists.
 */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, server timezone
}

/** Start of "today" (UTC day, matching todayKey above) as an epoch-ms cutoff. */
export function startOfTodayMs(): number {
  return new Date(`${todayKey()}T00:00:00.000Z`).getTime();
}

export async function getUsedSeconds(childId: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT seconds FROM daily_usage WHERE child_id = ? AND date_key = ?",
    args: [childId, todayKey()],
  });
  return Number(result.rows[0]?.seconds ?? 0);
}

export async function addUsedSeconds(childId: string, seconds: number): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO daily_usage (child_id, date_key, seconds) VALUES (?, ?, ?)
          ON CONFLICT (child_id, date_key) DO UPDATE SET seconds = seconds + excluded.seconds`,
    args: [childId, todayKey(), seconds],
  });
}

export async function isOverDailyLimit(childId: string): Promise<boolean> {
  const limitMinutes = Number(process.env.DAILY_LIMIT_MINUTES ?? 15);
  const used = await getUsedSeconds(childId);
  return used >= limitMinutes * 60;
}

/**
 * Total seconds used today, summed across every child_id. The MVP has no
 * real per-child identity (see the caveat above), so the parent dashboard
 * treats "today's usage" as a single household total rather than trying to
 * pick one child_id to show.
 */
export async function getTotalUsedSecondsToday(): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT COALESCE(SUM(seconds), 0) as total FROM daily_usage WHERE date_key = ?",
    args: [todayKey()],
  });
  return Number(result.rows[0]?.total ?? 0);
}

/** Resets today's usage for every child_id, so a parent can undo an accidental limit hit. */
export async function resetTodayUsage(): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM daily_usage WHERE date_key = ?",
    args: [todayKey()],
  });
}
