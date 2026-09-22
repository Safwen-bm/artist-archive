import fs from "node:fs";
import path from "node:path";
import { getAll, meta } from "@/lib/data";

export const metadata = { title: "How it was made" };

export default function MethodPage() {
  const raw = fs.readFileSync(path.join(process.cwd(), "data/raw-cv.txt"), "utf8").trim();
  const sample = getAll().at(-1);
  const { images: _images, ...record } = sample!;

  return (
    <div className="prose">
      <h1>How it was made</h1>
      <p>
        The artist's CV is a list of lines. The archive turns each line into a structured record that can be
        filtered, searched and opened on its own page. This is the pipeline.
      </p>

      <h2>Pipeline</h2>
      <ol className="steps">
        <li>The raw CV text is read from a plain file.</li>
        <li>
          Gemini extracts each CV line into a structured JSON record. The request uses a response schema, so the model can
          only return the fields and type values we define.
        </li>
        <li>
          The result is validated again in code. A record with a missing or malformed field stops the run
          instead of reaching the site.
        </li>
        <li>
          Plain code adds what does not need AI: a stable URL id, and a review flag when the AI was not fully
          certain.
        </li>
        <li>
          The AI also proposes a short image search query for each entry. That query goes to the Pexels API, and
          the first landscape photos found are attached with their credits. If nothing is found, the page shows a
          generated placeholder.
        </li>
        <li>A person reads the flagged entries and corrects them in the JSON file.</li>
        <li>The website is built statically from that file, so it needs no API key at runtime.</li>
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

      <p className="meta-line">
        Data generated {meta.generatedAt.slice(0, 10)} with {meta.model}. Images: {meta.imageSource}.
      </p>
    </div>
  );
}
