"use client";

import { useMemo, useState } from "react";
import { TYPE_LABELS, type Experience } from "@/lib/schema";
import { Grid } from "./Grid";
import { Timeline } from "./Timeline";

type Sort = "newest" | "oldest";
type View = "grid" | "timeline";

function countBy(items: Experience[], key: (e: Experience) => string | null) {
  const map = new Map<string, number>();
  for (const e of items) {
    const k = key(e);
    if (k) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function Catalogue({ experiences }: { experiences: Experience[] }) {
  const [type, setType] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<View>("grid");

  const types = useMemo(() => countBy(experiences, (e) => e.type), [experiences]);
  const countries = useMemo(() => countBy(experiences, (e) => e.country), [experiences]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experiences.filter((e) => {
      if (type && e.type !== type) return false;
      if (country && e.country !== country) return false;
      if (!q) return true;
      const haystack = [e.title, e.institution, e.city, e.country, e.description, ...e.tags, String(e.year)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [experiences, type, country, query]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (sort === "newest" ? b.year - a.year : a.year - b.year)),
    [filtered, sort],
  );

  const hasFilter = type || country || query;
  const reset = () => {
    setType(null);
    setCountry(null);
    setQuery("");
  };

  return (
    <div className="index">
      <aside className="rail" aria-label="Filters">
        <div className="filter-group">
          <label htmlFor="search" className="sr-only">
            Search entries
          </label>
          <input
            id="search"
            className="search"
            type="search"
            placeholder="Search entries"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <h2>View</h2>
          <button className="filter-btn" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
            <span>Grid</span>
          </button>
          <button className="filter-btn" aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>
            <span>Timeline</span>
          </button>
        </div>

        <div className="filter-group">
          <h2>Type</h2>
          {types.map(([value, n]) => (
            <button
              key={value}
              className="filter-btn"
              aria-pressed={type === value}
              onClick={() => setType(type === value ? null : value)}
            >
              <span>{TYPE_LABELS[value as keyof typeof TYPE_LABELS]}</span>
              <span className="count">{n}</span>
            </button>
          ))}
        </div>

        <div className="filter-group">
          <h2>Country</h2>
          {countries.map(([value, n]) => (
            <button
              key={value}
              className="filter-btn"
              aria-pressed={country === value}
              onClick={() => setCountry(country === value ? null : value)}
            >
              <span>{value}</span>
              <span className="count">{n}</span>
            </button>
          ))}
        </div>

        {view === "grid" ? (
          <div className="filter-group">
            <h2>Order</h2>
            <button className="filter-btn" aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>
              Newest first
            </button>
            <button className="filter-btn" aria-pressed={sort === "oldest"} onClick={() => setSort("oldest")}>
              Oldest first
            </button>
          </div>
        ) : null}
      </aside>

      <section aria-label="Entries">
        <p className="result-line" aria-live="polite">
          {filtered.length} of {experiences.length} entries
          {hasFilter ? (
            <>
              {" "}
              <button className="reset" onClick={reset}>
                Clear filters
              </button>
            </>
          ) : null}
        </p>

        {view === "grid" ? <Grid experiences={sorted} /> : <Timeline experiences={filtered} />}
      </section>
    </div>
  );
}