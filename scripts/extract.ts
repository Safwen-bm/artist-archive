/**
 * CV to archive pipeline (CLI).
 * Gemini/Pexels calls live in lib/extract-ai.ts, shared with /playground.
 *
 * Usage:
 *   npm run extract
 *   npm run extract -- path/to/other-cv.txt
 *   npm run extract -- --skip-images
 */
import fs from "node:fs";
import path from "node:path";
import { extractFromLines, findImages } from "../lib/extract-ai";
import { DatasetSchema, computeNeedsReview, type Experience, type Extracted } from "../lib/schema";

const ROOT = path.resolve(__dirname, "..");

function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

const args = process.argv.slice(2);
const skipImages = args.includes("--skip-images");
const inputArg = args.find((a) => !a.startsWith("--"));
const inputFile = path.resolve(ROOT, inputArg ?? "data/raw-cv.txt");
const outputFile = path.join(ROOT, "data/experiences.json");

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const PEXELS_KEY = process.env.PEXELS_API_KEY;

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function makeIds(items: Extracted[]) {
  const seen = new Map<string, number>();
  return items.map((e) => {
    const base = `${e.year}-${slugify(e.institution ?? e.title)}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

async function main() {
  if (!GEMINI_KEY) {
    console.error("Missing GEMINI_API_KEY. Copy .env.example to .env.local and add a free key.");
    process.exit(1);
  }
  if (!skipImages && !PEXELS_KEY) {
    console.warn("No PEXELS_API_KEY found, continuing without images (placeholders will be used).");
  }

  const lines = fs
    .readFileSync(inputFile, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  console.log(`Read ${lines.length} CV lines from ${path.relative(ROOT, inputFile)}`);

  const extracted: Extracted[] = [];
  for (let i = 0; i < lines.length; i += 25) {
    extracted.push(...(await extractFromLines(lines.slice(i, i + 25), GEMINI_KEY, GEMINI_MODEL)));
  }

  if (extracted.length !== lines.length) {
    console.warn(
      `Warning: ${lines.length} lines in, ${extracted.length} records out. Check the output before publishing.`,
    );
  }

  const ids = makeIds(extracted);
  const experiences: Experience[] = [];
  for (const [i, e] of extracted.entries()) {
    const images = !skipImages && PEXELS_KEY ? await findImages(e, PEXELS_KEY) : [];
    experiences.push({ ...e, id: ids[i], images, needsReview: computeNeedsReview(e) });
    console.log(`  ${ids[i]}  confidence=${e.confidence}  images=${images.length}`);
  }

  const dataset = DatasetSchema.parse({
    meta: {
      generatedAt: new Date().toISOString(),
      model: GEMINI_MODEL,
      sourceFile: path.relative(ROOT, inputFile),
      imageSource: skipImages || !PEXELS_KEY ? "none" : "Pexels",
    },
    experiences,
  });

  fs.writeFileSync(outputFile, JSON.stringify(dataset, null, 2) + "\n");
  const review = experiences.filter((e) => e.needsReview).map((e) => e.id);
  console.log(`\nWrote ${experiences.length} records to ${path.relative(ROOT, outputFile)}`);
  console.log(review.length ? `Needs human review: ${review.join(", ")}` : "No records flagged for review.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});