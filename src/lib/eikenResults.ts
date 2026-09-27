import { getDb } from "./db";
import { startOfTodayMs } from "./usageLimiter";

export type EikenStep = { prompt: string; answer: string };
export type EikenPoint = { kind: "praise" | "tip"; text: string };
export type EikenResult = {
  id: number;
  grade: string;
  transcript: EikenStep[];
  headline: string;
  points: EikenPoint[];
  createdAt: number;
};

export async function saveEikenResult(
  childId: string,
  grade: string,
  transcript: EikenStep[],
  headline: string,
  points: EikenPoint[]
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO eiken_results (child_id, grade, transcript_json, headline, points_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [childId, grade, JSON.stringify(transcript), headline, JSON.stringify(points), Date.now()],
  });
}

/** A single child's practice interviews from today, newest first. */
export async function listTodayEikenResults(childId: string): Promise<EikenResult[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT id, grade, transcript_json, headline, points_json, created_at FROM eiken_results
          WHERE child_id = ? AND created_at >= ? ORDER BY created_at DESC`,
    args: [childId, startOfTodayMs()],
  });
  return result.rows.map((r) => ({
    id: Number(r.id),
    grade: String(r.grade),
    transcript: JSON.parse(String(r.transcript_json)) as EikenStep[],
    headline: String(r.headline),
    points: JSON.parse(String(r.points_json)) as EikenPoint[],
    createdAt: Number(r.created_at),
  }));
}
