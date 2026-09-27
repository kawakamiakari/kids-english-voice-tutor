import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Same client, same SQL, whether DATABASE_URL points at a local file (the
 * default - no external account needed) or a hosted Turso database
 * (libsql://... + DATABASE_AUTH_TOKEN). Moving from "home use" to "hosted on
 * Vercel" later is just swapping these two env vars, no code changes.
 */
const DEFAULT_LOCAL_URL = "file:./data/app.db";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function getClient(): Client {
  if (client) return client;

  const url = process.env.DATABASE_URL ?? DEFAULT_LOCAL_URL;
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  client = createClient({
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  return client;
}

async function ensureSchema(db: Client): Promise<void> {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS daily_usage (
         child_id TEXT NOT NULL,
         date_key TEXT NOT NULL,
         seconds INTEGER NOT NULL DEFAULT 0,
         PRIMARY KEY (child_id, date_key)
       )`,
      `CREATE TABLE IF NOT EXISTS chat_turns (
         session_id TEXT NOT NULL,
         turn_index INTEGER NOT NULL,
         role TEXT NOT NULL,
         content TEXT NOT NULL,
         created_at INTEGER NOT NULL,
         PRIMARY KEY (session_id, turn_index)
       )`,
      `CREATE TABLE IF NOT EXISTS flag_events (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         child_id TEXT NOT NULL,
         child_text TEXT NOT NULL,
         reason TEXT NOT NULL,
         created_at INTEGER NOT NULL
       )`,
      `CREATE TABLE IF NOT EXISTS session_summaries (
         conversation_id TEXT PRIMARY KEY,
         child_id TEXT NOT NULL,
         headline TEXT NOT NULL,
         points_json TEXT NOT NULL,
         created_at INTEGER NOT NULL
       )`,
      // Single fixed row (id = 1): this app has one shared parent PIN, not
      // per-parent accounts, so there is nothing to key a lockout by except
      // "the PIN entry form" itself.
      `CREATE TABLE IF NOT EXISTS parent_login_attempts (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         fail_count INTEGER NOT NULL DEFAULT 0,
         locked_until INTEGER NOT NULL DEFAULT 0
       )`,
    ],
    "write"
  );
}

/** Every caller awaits this first; the CREATE TABLEs only actually run once per process. */
export async function getDb(): Promise<Client> {
  const db = getClient();
  if (!schemaReady) {
    schemaReady = ensureSchema(db);
  }
  await schemaReady;
  return db;
}
