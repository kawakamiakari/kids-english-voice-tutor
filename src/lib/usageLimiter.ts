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
