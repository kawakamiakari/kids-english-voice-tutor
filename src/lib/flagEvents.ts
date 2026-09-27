import { getDb } from "./db";
import { startOfTodayMs } from "./usageLimiter";

export type FlagEvent = {
  childText: string;
  reason: string;
  createdAt: number;
};

/** Persists an off-topic attempt (see the REPLY_SCHEMA off_topic_attempt flag in systemPrompt.ts). */
export async function recordFlagEvent(childId: string, childText: string, reason: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO flag_events (child_id, child_text, reason, created_at) VALUES (?, ?, ?, ?)",
    args: [childId, childText, reason, Date.now()],
  });
}

/** All flag events from today, newest first, across every child_id (see usageLimiter.ts caveat). */
export async function listTodayFlagEvents(): Promise<FlagEvent[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT child_text, reason, created_at FROM flag_events
          WHERE created_at >= ? ORDER BY created_at DESC`,
    args: [startOfTodayMs()],
  });
  return result.rows.map((r) => ({
    childText: String(r.child_text),
    reason: String(r.reason),
    createdAt: Number(r.created_at),
  }));
}
