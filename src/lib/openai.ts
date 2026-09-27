import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is not set. Add it to .env.local (server-side only)."
  );
}

/**
 * This client must only ever be imported from server-side code
 * (Route Handlers under src/app/api/**). Never import this file
 * from a "use client" component - that would bundle your API key
 * into client-side JavaScript.
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
