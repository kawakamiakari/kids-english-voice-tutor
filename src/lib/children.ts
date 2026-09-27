import { randomUUID } from "node:crypto";
import { getDb } from "./db";

/** A rough English-level bucket, not a literal age (see systemPrompt.ts LEVEL_PROFILES). */
export type Level = 1 | 2 | 3;
export type Child = { id: string; name: string; level: Level; createdAt: number };

export async function listChildren(): Promise<Child[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, name, level, created_at FROM children ORDER BY created_at ASC",
    args: [],
  });
  return result.rows.map(toChild);
}

export async function getChild(id: string): Promise<Child | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT id, name, level, created_at FROM children WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0];
  return row ? toChild(row) : null;
}

export async function createChild(name: string, level: Level): Promise<Child> {
  const db = await getDb();
  const id = randomUUID();
  const createdAt = Date.now();
  await db.execute({
    sql: "INSERT INTO children (id, name, level, created_at) VALUES (?, ?, ?, ?)",
    args: [id, name, level, createdAt],
  });
  return { id, name, level, createdAt };
}

/**
 * Deletes a child profile and everything recorded under their child_id
 * (usage, chat memory, flag log, summaries) - this app keeps minimal data by
 * design (see README), so a removed profile shouldn't leave orphaned rows.
 */
export async function deleteChild(id: string): Promise<void> {
  const db = await getDb();
  await db.batch(
    [
      { sql: "DELETE FROM daily_usage WHERE child_id = ?", args: [id] },
      { sql: "DELETE FROM chat_turns WHERE session_id = ?", args: [id] },
      { sql: "DELETE FROM flag_events WHERE child_id = ?", args: [id] },
      { sql: "DELETE FROM session_summaries WHERE child_id = ?", args: [id] },
      { sql: "DELETE FROM eiken_results WHERE child_id = ?", args: [id] },
      { sql: "DELETE FROM children WHERE id = ?", args: [id] },
    ],
    "write"
  );
}

function toChild(row: Record<string, unknown>): Child {
  return {
    id: String(row.id),
    name: String(row.name),
    level: Number(row.level) as Level,
    createdAt: Number(row.created_at),
  };
}
