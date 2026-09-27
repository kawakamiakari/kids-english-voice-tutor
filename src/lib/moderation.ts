import { openai } from "./openai";

/**
 * Runs OpenAI's free moderation model over a piece of text.
 * Used TWICE per turn in this app: once on the child's transcribed speech
 * (before it ever reaches the tutor model), and once on the tutor's own
 * reply (before it is ever spoken aloud to the child).
 */
export async function isFlagged(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  const result = await openai.moderations.create({
    model: "omni-moderation-latest",
    input: text,
  });
  return result.results.some((r) => r.flagged);
}
