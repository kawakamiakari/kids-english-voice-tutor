import { getDb } from "./db";
import { startOfTodayMs } from "./usageLimiter";

export type SummaryPoint = { kind: "praise" | "tip"; text: string };
export type StoredSummary = {
  conversationId: string;
  headline: string;
  points: SummaryPoint[];
  createdAt: number;
};

/**
 * Persists the end-of-conversation summary (see SUMMARY_PROMPT/SUMMARY_SCHEMA in
 * systemPrompt.ts) so the parent dashboard can show today's topics after the
 * browser tab that generated them is gone. Keyed by conversationId (one per
 * tap-to-start/tap-to-stop block), not childId, since a single child_id can
 * produce many conversations in a day.
 */
export async function saveSummary(
  conversationId: string,
  childId: string,
  headline: string,
  points: SummaryPoint[]
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO session_summaries (conversation_id, child_id, headline, points_json, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (conversation_id) DO UPDATE SET
            headline = excluded.headline, points_json = excluded.points_json`,
    args: [conversationId, childId, headline, JSON.stringify(points), Date.now()],
  });
}

/** All summaries from today, newest first, across every child_id (see usageLimiter.ts caveat). */
export async function listTodaySummaries(): Promise<StoredSummary[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT conversation_id, headline, points_json, created_at FROM session_summaries
          WHERE created_at >= ? ORDER BY created_at DESC`,
    args: [startOfTodayMs()],
  });
  return result.rows.map((r) => ({
    conversationId: String(r.conversation_id),
    headline: String(r.headline),
    points: JSON.parse(String(r.points_json)) as SummaryPoint[],
    createdAt: Number(r.created_at),
  }));
}
