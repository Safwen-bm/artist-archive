import fs from "node:fs";
import path from "node:path";
import { getAll, meta } from "@/lib/data";

export const metadata = { title: "How it was made" };

export default function MethodPage() {
  const raw = fs
    .readFileSync(path.join(process.cwd(), "data/raw-cv.txt"), "utf8")
    .trim();
  const sample = getAll().at(-1);
  const { images: _images, ...record } = sample!;

  return (
    <div className="prose">
      <h1>How it was made</h1>
      <p>
        The artist's CV is a list of lines. The archive turns each line into a
        structured record that can be filtered, searched and opened on its own
        page. This is the pipeline.
      </p>

      <h2>Pipeline</h2>
      <ol className="steps">
        <li>The raw CV text is read from a plain file.</li>
        <li>
          Gemini extracts each CV line into a structured JSON record. The
          request uses a response schema, so the model can only return the
          fields and type values we define.
        </li>
        <li>
          The result is validated again in code. A record with a missing or
          malformed field stops the run instead of reaching the site.
        </li>
        <li>
          Plain code adds what does not need AI: a stable URL id, and a review
          flag when the AI was not fully certain.
        </li>
        <li>
          The AI also proposes a short image search query for each entry. That
          query goes to the Pexels API, and the first landscape photos found are
          attached with their credits. If nothing is found, the page shows a
          generated placeholder.
        </li>
        <li>
          A person reads the flagged entries and corrects them in the JSON file.
        </li>
        <li>
          The website is built statically from that file, so it needs no API key
          at runtime.
        </li>
      </ol>

      <h2>One line, before and after</h2>
      <div className="compare">
        <div>
          <h3>Raw CV</h3>
          <pre className="json">{raw}</pre>
        </div>
        <div>
          <h3>Structured record</h3>
          <pre className="json">{JSON.stringify(record, null, 2)}</pre>
        </div>
      </div>

      <h2>Who does what</h2>
      <div className="split">
        <div>
          <h3>AI</h3>
          <ul>
            <li>Splits each line into year, type, institution and city</li>
            <li>Infers obvious gaps such as the country of a city</li>
            <li>Writes a short neutral description</li>
            <li>Suggests tags and an image query</li>
          </ul>
        </div>
        <div>
          <h3>Code</h3>
          <ul>
            <li>Enforces the schema</li>
            <li>Creates URL ids</li>
            <li>Fetches images and credits</li>
            <li>Flags uncertain records</li>
          </ul>
        </div>
        <div>
          <h3>A person</h3>
          <ul>
            <li>Checks flagged entries</li>
            <li>Confirms descriptions</li>
            <li>Replaces stock images with the artist's own documentation</li>
          </ul>
        </div>
      </div>

      <h2>Multi-artist version: database and authentication</h2>
      <p>
        This prototype is single-artist and stateless: one committed JSON file,
        no accounts, no writes at runtime. A real version, many artists, each
        managing their own archive, needs two things this prototype deliberately
        doesn&apos;t have yet.
      </p>

      <h3>Data model</h3>
      <pre className="arch-diagram">{`User
  |
  v
Artist Profile   (name, bio, links, one per user)
  |
  v
Archive          (one per artist profile)
  |
  v
Experiences      (year, type, institution, city, country,
                   description, tags, images, needsReview)`}</pre>
      <p>
        Experiences keep the same shape already in use, that part doesn&apos;t
        change. What&apos;s new is that they belong to an Archive, which belongs
        to an Artist Profile, which belongs to a User. A Postgres table per box
        above, with foreign keys, is enough, no need for anything more exotic.
      </p>

      <h3>Auth and publishing flow</h3>
      <pre className="arch-diagram">{`Login
  |
  v
Dashboard        (this page, per logged-in artist)
  |
  v
My Archive       (list experiences, edit or delete one)
  |
  v
Edit / Review    (fix a field, clear a "needs review" flag)
  |
  v
Publish          (write to the database, now visible on /archive)`}</pre>
      <p>
        The ingestion pipeline (upload, extract text, group into entries, run
        through Gemini) stays exactly as it is, it feeds into &quot;Edit /
        Review&quot; instead of a JSON file. &quot;Publish&quot; is the one
        genuinely new step: right now nothing this prototype generates is ever
        saved, that button is what a database is actually for.
      </p>
      <p>
        Not built here on purpose: this is still the CV-to-archive prototype the
        brief asked for, adding real accounts and a database is a separate,
        larger piece of work than what&apos;s being evaluated.
      </p>

      <p className="meta-line">
        Data generated {meta.generatedAt.slice(0, 10)} with {meta.model}.
        Images: {meta.imageSource}.
      </p>
    </div>
  );
}
