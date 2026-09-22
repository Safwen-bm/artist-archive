import Link from "next/link";
import { TYPE_LABELS, type Experience } from "@/lib/schema";

export function Timeline({ experiences }: { experiences: Experience[] }) {
  if (experiences.length === 0) {
    return <p className="empty">No entries match. Clear the filters or try a different search.</p>;
  }
  const ordered = [...experiences].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));

  return (
    <ol className="timeline">
      {ordered.map((e) => (
        <li key={e.id} className="timeline-row">
          <span className="timeline-year">{e.year}</span>
          <span className="timeline-dot" aria-hidden="true" />
          <Link href={`/archive/${e.id}`} className="timeline-card">
            <span className="timeline-type">{TYPE_LABELS[e.type]}</span>
            <strong className="timeline-title">{e.title}</strong>
            <span className="timeline-place">{[e.city, e.country].filter(Boolean).join(", ")}</span>
            {e.needsReview ? <span className="review-flag">Needs review</span> : null}
          </Link>
        </li>
      ))}
    </ol>
  );
}