import raw from "@/data/experiences.json";
import artistRaw from "@/data/artist.json";
import { ArtistSchema, DatasetSchema, type Experience } from "./schema";

const dataset = DatasetSchema.parse(raw);
const artist = ArtistSchema.parse(artistRaw);

export const meta = dataset.meta;

export function getAll(): Experience[] {
  return [...dataset.experiences].sort(
    (a, b) => b.year - a.year || a.id.localeCompare(b.id),
  );
}

export function getBySlug(slug: string): Experience | undefined {
  return dataset.experiences.find((e) => e.id === slug);
}

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

export function getArtist() {
  return artist;
}

/** Counts shown on the landing page. Derived, never stored. */
export function getStats() {
  const experiences = dataset.experiences;
  const years = experiences.map((e) => e.year);
  const countries = new Set(experiences.map((e) => e.country).filter(Boolean));
  const institutions = new Set(experiences.map((e) => e.institution).filter(Boolean));
  return {
    total: experiences.length,
    countries: countries.size,
    institutions: institutions.size,
    yearFrom: years.length ? Math.min(...years) : null,
    yearTo: years.length ? Math.max(...years) : null,
  };
}