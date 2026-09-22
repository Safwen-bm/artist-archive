import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAll, getBySlug, getNeighbours } from "@/lib/data";
import { TYPE_LABELS } from "@/lib/schema";
import { Placeholder } from "@/app/components/Placeholder";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAll().map((e) => ({ slug: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const e = getBySlug(slug);
  if (!e) return {};
  return { title: `${e.title}, ${e.year}`, description: e.description };
}

export default async function ExperiencePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const e = getBySlug(slug);
  if (!e) notFound();

  const { previous, next } = getNeighbours(e.id);
  const place = [e.city, e.country].filter(Boolean).join(", ");
  const { images: _images, ...record } = e;

  return (
    <>
      <p className="crumb">
        <Link href="/">Archive</Link> / {e.year}
      </p>

      <article className="detail">
        <div className="detail-media">
          {e.images.length > 0 ? (
            <>
              {e.images.map((img) => (
                <div className="frame" key={img.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.alt} />
                </div>
              ))}
              <p className="image-note">
                Contextual images found automatically, not the artist's own work. Photos by{" "}
                {e.images.map((img, i) => (
                  <span key={img.url}>
                    {i > 0 ? ", " : ""}
                    <a href={img.creditUrl}>{img.credit}</a>
                  </span>
                ))}{" "}
                on Pexels. To be replaced with the artist's documentation.
              </p>
            </>
          ) : (
            <div className="frame">
              <Placeholder experience={e} wide />
            </div>
          )}
        </div>

        <div className="detail-info">
          <p className="detail-year">{e.year}</p>
          <h1>{e.title}</h1>

          <dl className="facts">
            <dt>Type</dt>
            <dd>{TYPE_LABELS[e.type]}</dd>
            {e.institution && (
              <>
                <dt>Institution</dt>
                <dd>{e.institution}</dd>
              </>
            )}
            {place && (
              <>
                <dt>Place</dt>
                <dd>{place}</dd>
              </>
            )}
          </dl>

          <p className="lede">{e.description}</p>

          <ul className="tags" aria-label="Tags">
            {e.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>

          <details className="provenance">
            <summary>Where this entry comes from</summary>
            <blockquote>{e.sourceText}</blockquote>
            <p>
              Extraction confidence: <strong>{e.confidence}</strong>
              {e.needsReview ? ". Flagged for human review." : "."}
            </p>
            {e.inferredFields.length > 0 && (
              <p>Filled in by the AI, not written in the CV: {e.inferredFields.join(", ")}.</p>
            )}
            <pre className="json">{JSON.stringify(record, null, 2)}</pre>
          </details>
        </div>
      </article>

      <nav className="pager" aria-label="Other entries">
        {previous ? (
          <Link href={`/experiences/${previous.id}`}>
            <small>Previous, {previous.year}</small>
            <strong>{previous.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/experiences/${next.id}`} className="next">
            <small>Next, {next.year}</small>
            <strong>{next.title}</strong>
          </Link>
        ) : null}
      </nav>
    </>
  );
}
