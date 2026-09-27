import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "./db";

/**
 * One shared PIN for the whole household (see PARENT_PIN in .env.local.example) -
 * matches this app's "one honest family" trust model, so there are no per-parent
 * accounts to manage. Gates /parent and the usage-reset action so a child can't
 * change settings or wipe their own daily limit (see README "本番運用前にやるべきこと").
 */
export const PARENT_SESSION_COOKIE = "parent_session";
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function getSecret(): string {
  const pin = process.env.PARENT_PIN;
  if (!pin) {
    throw new Error("PARENT_PIN is not set - see .env.local.example");
  }
  return pin;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

/** A signed, expiring token - not a JWT library, just enough to avoid re-checking the PIN on every click. */
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(sign(payload), "hex");
    actual = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

function timingSafePinEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Compare against a fixed-length digest first so mismatched lengths don't
  // short-circuit the comparison (and thus don't leak PIN length via timing).
  const digestA = createHmac("sha256", "pin-compare").update(bufA).digest();
  const digestB = createHmac("sha256", "pin-compare").update(bufB).digest();
  return timingSafeEqual(digestA, digestB) && bufA.length === bufB.length;
}

async function getLockoutRow(): Promise<{ failCount: number; lockedUntil: number }> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO parent_login_attempts (id, fail_count, locked_until) VALUES (1, 0, 0) ON CONFLICT (id) DO NOTHING",
    args: [],
  });
  const result = await db.execute({
    sql: "SELECT fail_count, locked_until FROM parent_login_attempts WHERE id = 1",
    args: [],
  });
  const row = result.rows[0];
  return { failCount: Number(row?.fail_count ?? 0), lockedUntil: Number(row?.locked_until ?? 0) };
}

/** Ms remaining until login is allowed again, or 0 if not locked. */
export async function getLockoutRemainingMs(): Promise<number> {
  const { lockedUntil } = await getLockoutRow();
  return Math.max(0, lockedUntil - Date.now());
}

async function recordFailedAttempt(): Promise<void> {
  const db = await getDb();
  const { failCount } = await getLockoutRow();
  const nextCount = failCount + 1;
  const lockedUntil = nextCount >= MAX_FAILED_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
  await db.execute({
    sql: "UPDATE parent_login_attempts SET fail_count = ?, locked_until = ? WHERE id = 1",
    args: [nextCount, lockedUntil],
  });
}

async function recordSuccessfulAttempt(): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "UPDATE parent_login_attempts SET fail_count = 0, locked_until = 0 WHERE id = 1",
    args: [],
  });
}

export type PinCheckResult = { ok: true } | { ok: false; lockedForMs?: number };

/** Verifies a submitted PIN against PARENT_PIN, honoring the failed-attempt lockout. */
export async function checkPin(submittedPin: string): Promise<PinCheckResult> {
  const remaining = await getLockoutRemainingMs();
  if (remaining > 0) {
    return { ok: false, lockedForMs: remaining };
  }

  const isMatch = timingSafePinEqual(submittedPin, getSecret());
  if (!isMatch) {
    await recordFailedAttempt();
    return { ok: false };
  }

  await recordSuccessfulAttempt();
  return { ok: true };
}

/** True if the request carries a valid, unexpired parent session cookie. */
export function isParentAuthorized(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(PARENT_SESSION_COOKIE)?.value);
}
