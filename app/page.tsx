import Link from "next/link";
import { getArtist, getStats } from "@/lib/data";
import { ArtistHeader } from "@/app/components/ArtistHeader";
import { Stats } from "@/app/components/Stats";

export default function LandingPage() {
  const artist = getArtist();
  const stats = getStats();

  return (
    <div className="landing">
      <section className="hero">
        <p className="eyebrow">Artist archive, prototype</p>
        <h1>Transforming an unstructured CV into a structured digital archive.</h1>
        <p className="hero-sub">
          Every residency, exhibition and collaboration below started as a single line of text. AI read it,
          structured it, and a person reviews what it wasn&apos;t sure about.
        </p>
        <div className="cta-row">
          <Link href="/archive" className="btn btn-primary">
            Explore archive
          </Link>
          <Link href="/playground" className="btn btn-ghost">
            Build an archive
          </Link>
        </div>
      </section>

      <Stats stats={stats} />

      <section className="landing-artist">
        <ArtistHeader artist={artist} />
      </section>

      <section className="landing-footer-note">
        <p>
          Curious how the extraction actually works? Read <Link href="/method">how it was made</Link>, or paste
          your own CV lines into the <Link href="/playground">AI archive builder</Link> and watch it happen live.
        </p>
      </section>
    </div>
  );
}