import Link from "next/link";
import { getArtist, getAll } from "@/lib/data";

export const metadata = { title: "Dashboard" };

export default function AdminDashboard() {
  const artist = getArtist();
  const experiences = getAll();
  const needsReview = experiences.filter((e) => e.needsReview).length;
  const reviewed = experiences.length - needsReview;

  return (
    <div className="dashboard">
      <p className="eyebrow">AEITOS · Artist dashboard</p>
      <h1>My Archive</h1>
      <p className="dashboard-artist">{artist.name}</p>

      <dl className="dashboard-stats">
        <div className="dashboard-stat">
          <dd>{experiences.length}</dd>
          <dt>{experiences.length === 1 ? "experience" : "experiences"}</dt>
        </div>
        <div className="dashboard-stat">
          <dd>{reviewed}</dd>
          <dt>reviewed</dt>
        </div>
        <div className="dashboard-stat dashboard-stat-warn">
          <dd>{needsReview}</dd>
          <dt>needs review</dt>
        </div>
      </dl>

      <div className="cta-row">
        <Link href="/admin/ingest" className="btn btn-primary">
          Edit archive
        </Link>
        <Link href="/" className="btn btn-ghost">
          Preview public site
        </Link>
      </div>

      <p className="dashboard-note">
        This reads the same committed data the public site does, there is no
        account system behind it yet, so it is a single-artist view rather than
        a real login. See <Link href="/method">how it was made</Link> for the
        database and authentication plan for a real, multi-artist version of
        this dashboard.
      </p>
    </div>
  );
}
