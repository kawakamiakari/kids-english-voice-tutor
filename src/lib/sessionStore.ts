export type ChatTurn = { role: "user" | "assistant"; content: string };

type SessionData = {
  history: ChatTurn[];
  updatedAt: number;
};

/**
 * MVP-only in-memory store, keyed by a random sessionId the browser
 * generates once per tab (see useVoiceChat.ts). Nothing here is written
 * to disk, so it disappears when the server restarts - which is exactly
 * what we want given we are not trying to retain a child's conversation
 * data by default.
 *
 * Caveat: this only works correctly on a single, always-on server process.
 * If you deploy to a multi-instance / serverless platform where different
 * requests can land on different instances, replace this with a shared
 * store (Redis / Upstash / a database) keyed by sessionId.
 */
const sessions = new Map<string, SessionData>();

const MAX_TURNS = 8; // keep only the last N turns to bound token usage
const SESSION_TTL_MS = 30 * 60 * 1000; // forget context after 30 minutes idle

export function getHistory(sessionId: string): ChatTurn[] {
  const s = sessions.get(sessionId);
  if (!s) return [];
  if (Date.now() - s.updatedAt > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return [];
  }
  return s.history;
}

export function appendTurn(sessionId: string, turn: ChatTurn) {
  const existing = sessions.get(sessionId)?.history ?? [];
  const history = [...existing, turn].slice(-MAX_TURNS);
  sessions.set(sessionId, { history, updatedAt: Date.now() });
}
