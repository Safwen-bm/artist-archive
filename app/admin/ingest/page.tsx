"use client";

import { useRef, useState } from "react";
import { TYPE_LABELS, type Extracted } from "@/lib/schema";
import { segmentIntoEntries } from "@/lib/segment";

type Record = Extracted & { needsReview: boolean };
type Step = "input" | "lines" | "results";

export default function AdminPage() {
  const [step, setStep] = useState<Step>("input");
  const [lines, setLines] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [records, setRecords] = useState<Record[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that file.");
      const blocks = segmentIntoEntries(data.lines as string[]);
      setLines(blocks.join("\n"));
      setSource(
        `${file.name} (${data.lines.length} raw lines, grouped into ${blocks.length} entries, check below)`,
      );
      setStep("lines");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function usePastedText() {
    if (!lines.trim()) return;
    const raw = lines.split("\n");
    const blocks = segmentIntoEntries(raw);
    setLines(blocks.join("\n"));
    setSource(
      `Pasted text (${raw.filter((l) => l.trim()).length} raw lines, grouped into ${blocks.length} entries, check below)`,
    );
    setStep("lines");
  }

  async function generate() {
    const cleaned = lines
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (cleaned.length === 0) return;

    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setRecords(data.records);
      if (data.truncated) setNotice(data.truncatedMessage);
      setStep("results");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setStep("input");
    setLines("");
    setSource(null);
    setRecords(null);
    setNotice(null);
    setError(null);
  }

  return (
    <div className="admin">
      <div className="page-head">
        <p className="eyebrow">Artist / curator tool, not the public site</p>
        <h1>Add an archive</h1>
        <p>
          This is the ingestion side: where a CV comes in and gets turned into
          structured entries, before anyone sees them in the public archive.
          Text, PDF, Word and spreadsheet files are read automatically. A Figma
          file, an InDesign export or a photographed portfolio aren&apos;t text,
          so there&apos;s no reliable automatic path from those, export or type
          a plain list of experiences first, then bring that in here.
        </p>
      </div>

      {step === "input" && (
        <div className="admin-input">
          <div className="admin-upload">
            <h2>Upload a file</h2>
            <p className="admin-hint">
              .txt, .pdf, .docx, .csv or .xlsx, up to 5 MB
            </p>
            {notice ? <p className="playground-error">{notice}</p> : null}
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.pdf,.docx,.csv,.xlsx"
              onChange={(e) =>
                e.target.files?.[0] && handleFile(e.target.files[0])
              }
              disabled={loading}
            />
          </div>

          <div className="admin-divider">or</div>

          <div className="admin-paste">
            <h2>Paste text</h2>
            <label htmlFor="paste-input" className="sr-only">
              CV text
            </label>
            <textarea
              id="paste-input"
              className="playground-input"
              rows={6}
              placeholder={
                "2019 — Residency at Villa Medici, Rome\n2020 — Group exhibition at Palais de Tokyo, Paris"
              }
              value={lines}
              onChange={(e) => setLines(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={usePastedText}
              disabled={!lines.trim() || loading}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "lines" && (
        <div className="admin-lines">
          <h2>Review the extracted text</h2>
          <p className="admin-hint">
            From: {source}. Fix anything the extraction got wrong, remove junk
            lines, one experience per line, before this goes to the AI.
          </p>
          <textarea
            className="playground-input"
            rows={10}
            value={lines}
            onChange={(e) => setLines(e.target.value)}
          />
          <div className="playground-actions">
            <button
              className="btn btn-primary"
              onClick={generate}
              disabled={loading || !lines.trim()}
            >
              {loading ? "Generating…" : "Generate structured archive"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={startOver}
              disabled={loading}
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {step === "results" && records && (
        <div className="admin-results">
          <h2>Structured output</h2>
          <p className="admin-hint">
            This is what the public archive would show, once these are reviewed
            and published.
          </p>
          <div className="playground-grid">
            {records.map((r, i) => (
              <article key={i} className="playground-card">
                <div className="playground-card-head">
                  <span className="tile-year">{r.year}</span>
                  {r.needsReview ? (
                    <span className="review-flag">Needs review</span>
                  ) : null}
                </div>
                <h3>{r.title}</h3>
                <p className="tile-meta">
                  {TYPE_LABELS[r.type]}
                  {r.city ? ` · ${r.city}` : ""}
                  {r.country ? `, ${r.country}` : ""}
                </p>
                <p className="playground-desc">{r.description}</p>
              </article>
            ))}
          </div>
          <details className="provenance">
            <summary>Raw JSON</summary>
            <pre className="json">{JSON.stringify(records, null, 2)}</pre>
          </details>
          <div className="playground-actions">
            <button className="btn btn-ghost" onClick={startOver}>
              Start over
            </button>
          </div>
        </div>
      )}

      {error ? <p className="playground-error">{error}</p> : null}
    </div>
  );
}
