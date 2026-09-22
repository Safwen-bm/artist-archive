import raw from "@/data/experiences.json";
import { DatasetSchema, type Experience } from "./schema";

const dataset = DatasetSchema.parse(raw);

export const meta = dataset.meta;

/** Newest first, the default order of the catalogue. */
export function getAll(): Experience[] {
  return [...dataset.experiences].sort(
    (a, b) => b.year - a.year || a.id.localeCompare(b.id),
  );
}

export function getBySlug(slug: string): Experience | undefined {
  return dataset.experiences.find((e) => e.id === slug);
}

/** Chronological neighbours, used for previous / next links on detail pages. */
export function getNeighbours(slug: string): {
  previous?: Experience;
  next?: Experience;
} {
  const chronological = [...dataset.experiences].sort(
    (a, b) => a.year - b.year || a.id.localeCompare(b.id),
  );
  const i = chronological.findIndex((e) => e.id === slug);
  return { previous: chronological[i - 1], next: chronological[i + 1] };
}
