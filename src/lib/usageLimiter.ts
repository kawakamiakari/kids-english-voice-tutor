/**
 * Extremely small MVP time-limiter: tracks total conversation seconds per
 * day, per sessionId. Same in-memory caveat as sessionStore.ts applies -
 * swap this for a real store (with a stable per-child ID, not a per-tab
 * sessionId) before relying on it as an actual parental control.
 */
const usage = new Map<string, { dateKey: string; seconds: number }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, server timezone
}

export function getUsedSeconds(childId: string): number {
  const entry = usage.get(childId);
  if (!entry || entry.dateKey !== todayKey()) return 0;
  return entry.seconds;
}

export function addUsedSeconds(childId: string, seconds: number): void {
  const key = todayKey();
  const entry = usage.get(childId);
  if (!entry || entry.dateKey !== key) {
    usage.set(childId, { dateKey: key, seconds });
  } else {
    usage.set(childId, { dateKey: key, seconds: entry.seconds + seconds });
  }
}

export function isOverDailyLimit(childId: string): boolean {
  const limitMinutes = Number(process.env.DAILY_LIMIT_MINUTES ?? 15);
  return getUsedSeconds(childId) >= limitMinutes * 60;
}
