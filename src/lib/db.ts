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
