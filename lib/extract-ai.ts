import { EXPERIENCE_TYPES, ExtractedSchema, type Experience, type Extracted } from "./schema";

export const SYSTEM_PROMPT = `You convert unstructured artist CV lines into structured archive records.

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
      confidence: { type: "STRING", format: "enum", enum: ["high", "medium", "low"] },
    },
    required: [
      "year", "type", "title", "institution", "city", "country", "description",
      "tags", "imageQuery", "sourceText", "inferredFields", "confidence",
    ],
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function extractFromLines(
  lines: string[],
  apiKey: string,
  model: string,
): Promise<Extracted[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: `CV lines:\n${lines.join("\n")}` }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status >= 500) {
      const wait = 2000 * attempt;
      console.warn(`Gemini returned ${res.status}, retrying in ${wait / 1000}s (attempt ${attempt}/4)`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini returned no text: ${JSON.stringify(json).slice(0, 400)}`);

    return ExtractedSchema.array().parse(JSON.parse(text));
  }
  throw new Error("Gemini kept failing after 4 attempts. Try again later or set a different model.");
}

type PexelsPhoto = {
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { large: string };
};

async function searchPexels(query: string, apiKey: string) {
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) throw new Error(`Pexels error ${res.status}`);
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return data.photos ?? [];
}

export async function findImages(e: Extracted, pexelsKey: string): Promise<Experience["images"]> {
  const queries = [e.imageQuery, e.city ? `${e.city} art gallery` : ""].filter(Boolean);
  for (const q of queries) {
    try {
      const photos = await searchPexels(q, pexelsKey);
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
  return [];
}