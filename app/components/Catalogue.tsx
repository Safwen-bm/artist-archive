"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TYPE_LABELS, type Experience } from "@/lib/schema";
import { Placeholder } from "./Placeholder";

type Sort = "newest" | "oldest";

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

  const types = useMemo(() => countBy(experiences, (e) => e.type), [experiences]);
  const countries = useMemo(() => countBy(experiences, (e) => e.country), [experiences]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = experiences.filter((e) => {
      if (type && e.type !== type) return false;
      if (country && e.country !== country) return false;
      if (!q) return true;
      const haystack = [e.title, e.institution, e.city, e.country, e.description, ...e.tags, String(e.year)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return list.sort((a, b) => (sort === "newest" ? b.year - a.year : a.year - b.year));
  }, [experiences, type, country, query, sort]);

  const filtered = type || country || query;
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

        <div className="filter-group">
          <h2>Order</h2>
          <button className="filter-btn" aria-pressed={sort === "newest"} onClick={() => setSort("newest")}>
            Newest first
          </button>
          <button className="filter-btn" aria-pressed={sort === "oldest"} onClick={() => setSort("oldest")}>
            Oldest first
          </button>
        </div>
      </aside>

      <section aria-label="Entries">
        <p className="result-line" aria-live="polite">
          {visible.length} of {experiences.length} entries
          {filtered ? (
            <>
              {" "}
              <button className="reset" onClick={reset}>
                Clear filters
              </button>
            </>
          ) : null}
        </p>

        {visible.length === 0 ? (
          <p className="empty">No entries match. Clear the filters or try a different search.</p>
        ) : (
          <div className="grid">
            {visible.map((e) => (
              <Link key={e.id} href={`/experiences/${e.id}`} className="tile">
                <div className="frame">
                  {e.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.images[0].url} alt={e.images[0].alt} loading="lazy" />
                  ) : (
                    <Placeholder experience={e} />
                  )}
                </div>
                <div className="tile-year">{e.year}</div>
                <h3 className="tile-title">{e.title}</h3>
                <p className="tile-meta">{[e.city, e.country].filter(Boolean).join(", ")}</p>
                {e.needsReview ? <span className="review-flag">Needs review</span> : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
