/**
 * CV to archive pipeline.
 *
 *   raw CV text  ->  Gemini (structured JSON)  ->  schema validation
 *                ->  ids + review flags (plain code)  ->  Pexels images
 *                ->  data/experiences.json
 *
 * Usage:
 *   npm run extract
 *   npm run extract -- path/to/other-cv.txt
 *   npm run extract -- --skip-images
 */
import fs from "node:fs";
import path from "node:path";
import {
  DatasetSchema,
  EXPERIENCE_TYPES,
  ExtractedSchema,
  type Experience,
  type Extracted,
} from "../lib/schema";

const ROOT = path.resolve(__dirname, "..");

// ---------- tiny .env.local loader (no extra dependency) ----------
function loadEnv(file: string) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
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

// ---------- prompt ----------
const SYSTEM_PROMPT = `You convert unstructured artist CV lines into structured archive records.

Rules:
1. Produce exactly one record per CV line. Never merge, drop or reorder entries.
2. Copy facts from the text. Never invent institutions, titles, dates, collaborators or artworks.
3. If a field is not written in the line but can be inferred with near certainty (for example the country of a well known city), fill it and add the field name to inferredFields. If it cannot be inferred, return null.
4. description: one or two neutral sentences. No marketing language and no invented details about the artist's work. You may state widely known public facts about a real institution only if you are certain. Otherwise say only what the line says, and say that no further detail was provided. Always add "description" to inferredFields.
5. type must be one of: ${EXPERIENCE_TYPES.join(", ")}.
6. title: a short readable title such as "Group exhibition at Palais de Tokyo".
7. tags: 3 to 5 lowercase keywords useful for filtering (type, city, country, institution kind).
8. imageQuery: 2 to 5 words for a stock photo search that shows the place or setting. No people, no artworks.
9. sourceText: the original line copied verbatim.
10. confidence: "high" if year, type, institution and city are all explicit, "medium" if something is vague or needed inference, "low" if the line is ambiguous.`;

// Gemini structured output schema (OpenAPI subset)
const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      year: { type: "INTEGER" },
      type: { type: "STRING", format: "enum", enum: [...EXPERIENCE_TYPES] },
      title: { type: "STRING" },
      institution: { type: "STRING", nullable: true },
      city: { type: "STRING", nullable: true },
      country: { type: "STRING", nullable: true },
      description: { type: "STRING" },
      tags: { type: "ARRAY", items: { type: "STRING" } },
      imageQuery: { type: "STRING" },
      sourceText: { type: "STRING" },
      inferredFields: { type: "ARRAY", items: { type: "STRING" } },
      confidence: {
        type: "STRING",
        format: "enum",
        enum: ["high", "medium", "low"],
      },
    },
    required: [
      "year",
      "type",
      "title",
      "institution",
      "city",
      "country",
      "description",
      "tags",
      "imageQuery",
      "sourceText",
      "inferredFields",
      "confidence",
    ],
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Gemini ----------
async function extractBatch(lines: string[]): Promise<Extracted[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      { role: "user", parts: [{ text: `CV lines:\n${lines.join("\n")}` }] },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY!,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * attempt;
      console.warn(
        `Gemini returned ${res.status}, retrying in ${wait / 1000}s (attempt ${attempt}/4)`,
      );
      await sleep(wait);
      continue;
    }
    if (!res.ok)
      throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

    const json = await res.json();
    const text: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text)
      throw new Error(
        `Gemini returned no text: ${JSON.stringify(json).slice(0, 400)}`,
      );

    // Validate every record. Anything malformed stops the run instead of reaching the site.
    return ExtractedSchema.array().parse(JSON.parse(text));
  }
  throw new Error(
    "Gemini kept failing after 4 attempts. Try again later or set GEMINI_MODEL.",
  );
}

// ---------- Pexels ----------
type PexelsPhoto = {
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { large: string };
};

async function searchPexels(query: string) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: PEXELS_KEY! } },
  );
  if (!res.ok) throw new Error(`Pexels error ${res.status}`);
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return data.photos ?? [];
}

async function findImages(e: Extracted): Promise<Experience["images"]> {
  // Try the AI query first, then a broader fallback built from the city.
  const queries = [e.imageQuery, e.city ? `${e.city} art gallery` : ""].filter(
    Boolean,
  );
  for (const q of queries) {
    try {
      const photos = await searchPexels(q);
      if (photos.length) {
        return photos.map((p) => ({
          url: p.src.large,
          alt: p.alt || `${e.title}, contextual image`,
          credit: p.photographer,
          creditUrl: p.photographer_url,
          source: "pexels" as const,
        }));
      }
    } catch (err) {
      console.warn(`Pexels failed for "${q}":`, (err as Error).message);
    }
  }
  return []; // the site shows a generated placeholder
}

// ---------- plain code steps (no AI needed) ----------
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

// ---------- main ----------
async function main() {
  if (!GEMINI_KEY) {
    console.error(
      "Missing GEMINI_API_KEY. Copy .env.example to .env.local and add a free key.",
    );
    process.exit(1);
  }
  if (!skipImages && !PEXELS_KEY) {
    console.warn(
      "No PEXELS_API_KEY found, continuing without images (placeholders will be used).",
    );
  }

  const lines = fs
    .readFileSync(inputFile, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  console.log(
    `Read ${lines.length} CV lines from ${path.relative(ROOT, inputFile)}`,
  );

  // Batches keep long CVs inside the model's comfortable output size.
  const extracted: Extracted[] = [];
  for (let i = 0; i < lines.length; i += 25) {
    extracted.push(...(await extractBatch(lines.slice(i, i + 25))));
  }

  if (extracted.length !== lines.length) {
    console.warn(
      `Warning: ${lines.length} lines in, ${extracted.length} records out. Check the output before publishing.`,
    );
  }

  const ids = makeIds(extracted);
  const experiences: Experience[] = [];
  for (const [i, e] of extracted.entries()) {
    const images = !skipImages && PEXELS_KEY ? await findImages(e) : [];
    experiences.push({
      ...e,
      id: ids[i],
      images,
      needsReview:
        e.confidence !== "high" ||
        e.inferredFields.some((field) => field !== "description"),
    });
    console.log(
      `  ${ids[i]}  confidence=${e.confidence}  images=${images.length}`,
    );
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
  console.log(
    `\nWrote ${experiences.length} records to ${path.relative(ROOT, outputFile)}`,
  );
  console.log(
    review.length
      ? `Needs human review: ${review.join(", ")}`
      : "No records flagged for review.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
