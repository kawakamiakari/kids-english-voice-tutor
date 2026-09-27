import { getDb } from "./db";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Persisted short-term conversation memory (see lib/db.ts), keyed by a random
 * sessionId the browser generates once per tab (see useVoiceChat.ts). This
 * used to be an in-memory Map, which breaks under serverless deployment
 * (different requests can land on different instances with no shared
 * memory) - a real DB fixes that regardless of hosting.
 */
const MAX_TURNS = 8; // keep only the last N turns to bound token usage
const SESSION_TTL_MS = 30 * 60 * 1000; // forget context after 30 minutes idle

export async function getHistory(sessionId: string): Promise<ChatTurn[]> {
  const db = await getDb();
  const cutoff = Date.now() - SESSION_TTL_MS;
  const result = await db.execute({
    sql: `SELECT role, content FROM chat_turns
          WHERE session_id = ? AND created_at > ?
          ORDER BY turn_index ASC`,
    args: [sessionId, cutoff],
  });
  return result.rows.map((r) => ({ role: r.role as ChatTurn["role"], content: String(r.content) }));
}

export async function appendTurn(sessionId: string, turn: ChatTurn): Promise<void> {
  const db = await getDb();

  const countResult = await db.execute({
    sql: "SELECT COUNT(*) as n, MAX(turn_index) as maxIdx FROM chat_turns WHERE session_id = ?",
    args: [sessionId],
  });
  const nextIndex = Number(countResult.rows[0]?.maxIdx ?? -1) + 1;

  await db.execute({
    sql: "INSERT INTO chat_turns (session_id, turn_index, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [sessionId, nextIndex, turn.role, turn.content, Date.now()],
  });

  // Trim to the last MAX_TURNS for this session (bounds both token usage and
  // table growth - this table has no other cleanup/TTL sweep).
  await db.execute({
    sql: `DELETE FROM chat_turns
          WHERE session_id = ? AND turn_index <= ?`,
    args: [sessionId, nextIndex - MAX_TURNS],
  });
}
