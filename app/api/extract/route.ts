import { NextResponse } from "next/server";
import { extractFromLines } from "@/lib/extract-ai";
import { computeNeedsReview } from "@/lib/schema";

const MAX_LINES = 6;
const MAX_LINE_LENGTH = 200;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Best-effort in-memory throttle. Resets whenever the serverless instance
// recycles, so this is a courtesy limit, not real rate limiting.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function isRateLimited(id: string): boolean {
  const now = Date.now();
  const recent = (hits.get(id) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(id, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Playground is not configured. Set GEMINI_API_KEY in the deployment's environment variables." },
      { status: 500 },
    );
  }

  const id = req.headers.get("x-forwarded-for") ?? "anonymous";
  if (isRateLimited(id)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }

  let lines: unknown;
  try {
    ({ lines } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(lines) || lines.length === 0 || !lines.every((l) => typeof l === "string")) {
    return NextResponse.json({ error: "Send { lines: string[] }." }, { status: 400 });
  }

  const cleaned = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map((l) => l.slice(0, MAX_LINE_LENGTH));

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No usable lines in the request." }, { status: 400 });
  }

  try {
    const extracted = await extractFromLines(cleaned, apiKey, GEMINI_MODEL);
    const records = extracted.map((e) => ({ ...e, needsReview: computeNeedsReview(e) }));
    return NextResponse.json({ records, truncated: lines.length > MAX_LINES });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "The AI call failed. Try again in a moment." }, { status: 502 });
  }
}