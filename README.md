# Artist archive prototype

A small prototype that turns an unstructured artist CV into a browsable digital archive.
Each CV line becomes a structured record, shown in a filterable grid, with a dedicated page per entry.

Built with Next.js (App Router), TypeScript, Zod, the Gemini API and the Pexels API. Both APIs have free tiers.

## The approach

```
raw CV text
  -> Gemini, with a response schema, returns JSON
  -> Zod validates every record
  -> plain code adds ids and review flags
  -> Gemini's imageQuery goes to Pexels for contextual images
  -> data/experiences.json
  -> static Next.js site
```

The AI runs once, offline, as a script. The site is built from the JSON file it produces, so the deployed
site needs no API key, costs nothing to serve, and keeps working if an API is down.

## Data model

| Field | Source | Notes |
| --- | --- | --- |
| year, type, title, institution, city | AI | Read from the CV line. `type` is a fixed list. |
| country | AI, inferred | Filled when obvious (Rome gives Italy), and listed in `inferredFields`. |
| description | AI, generated | Neutral, no invented details. Always listed in `inferredFields`. |
| tags | AI | 3 to 5 lowercase keywords for filtering and search. |
| imageQuery | AI | Short stock photo query, used only for the image lookup. |
| sourceText | AI, verbatim | The original line, so every record can be traced back. |
| confidence | AI | high, medium or low. |
| id | Code | `year-institution` slug, used in the URL. |
| needsReview | Code | True when confidence is not high, or when any field other than `description` was inferred rather than read from the CV line. |
| images | Code | Pexels results with photographer credit. |

## What is automated and what is not

- Automated: splitting lines into fields, inferring obvious gaps, writing descriptions, suggesting tags, finding images, validating, generating ids.
- Kept human: reviewing flagged entries, confirming descriptions, and replacing stock images with the artist's own documentation.

Guardrails against hallucination: the prompt forbids invented facts, the response schema limits the shape
of the output, `sourceText` is stored verbatim, inferred fields are listed explicitly, and uncertain records
are flagged in the interface.

## Run it

```bash
npm install
cp .env.example .env.local     # add GEMINI_API_KEY and PEXELS_API_KEY
npm run extract                # reads data/raw-cv.txt, writes data/experiences.json
npm run dev                    # http://localhost:3000
```

Useful variations:

```bash
npm run extract -- --skip-images       # no Pexels lookup
npm run extract -- path/to/full-cv.txt # a different CV file
```

The committed `data/experiences.json` is real output from `npm run extract` (Gemini + Pexels), so
the site works as-is with no keys needed to build or deploy it.

## Deploy

Push to GitHub and import the repo in Vercel. No environment variables are needed, because the site is static.

## Pages

- `/` the catalogue with search, type and country filters, and sorting
- `/experiences/[slug]` the detail page, with the source line and JSON of the record
- `/method` a short explanation of the pipeline

## Next steps if this became the real project

- Feed a full CV in batches (already supported, 25 lines per request) and add a small review screen for flagged entries.
- Let the artist upload their own images and prefer them over stock photos.
- Extract more fields when the CV has them: collaborators, curators, catalogue references.
- Add embeddings for "related entries" and multilingual descriptions.
