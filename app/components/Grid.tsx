import Link from "next/link";
import { type Experience } from "@/lib/schema";
import { Placeholder } from "./Placeholder";

export function Grid({ experiences }: { experiences: Experience[] }) {
  if (experiences.length === 0) {
    return <p className="empty">No entries match. Clear the filters or try a different search.</p>;
  }
  return (
    <div className="grid">
      {experiences.map((e) => (
        <Link key={e.id} href={`/archive/${e.id}`} className="tile">
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
  );
}