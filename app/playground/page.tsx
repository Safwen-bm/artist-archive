"use client";

import { useState } from "react";
import { TYPE_LABELS, type Extracted } from "@/lib/schema";

const EXAMPLE = `2018 — Residency at Villa Medici, Rome
2020 — Exhibition at Palais de Tokyo, Paris
2023 — Collaboration with XYZ Foundation, London`;

type Record = Extracted & { needsReview: boolean };

export default function PlaygroundPage() {
  const [text, setText] = useState(EXAMPLE);
  const [records, setRecords] = useState<Record[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    setLoading(true);
    setError(null);
    setRecords(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setRecords(data.records);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="playground">
      <div className="page-head">
        <h1>AI archive builder</h1>
        <p>
          Paste a few CV lines below and Gemini turns them into structured records live, the same call the real
          archive was built from. Results here are a preview only, nothing is saved: this site has no database,
          so there is nowhere to persist them. See <a href="/method">how it was made</a> for the full pipeline.
        </p>
      </div>

      <label htmlFor="cv-input" className="sr-only">CV lines</label>
      <textarea
        id="cv-input"
        className="playground-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        maxLength={1200}
        placeholder="2019 — Residency at Villa Medici, Rome"
      />

      <div className="playground-actions">
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : "Generate archive"}
        </button>
        <span className="playground-hint">Up to 6 lines per request, so the demo stays free for everyone.</span>
      </div>

      {error ? <p className="playground-error">{error}</p> : null}

      {records ? (
        <div className="playground-results">
          <h2>Structured output</h2>
          <div className="playground-grid">
            {records.map((r, i) => (
              <article key={i} className="playground-card">
                <div className="playground-card-head">
                  <span className="tile-year">{r.year}</span>
                  {r.needsReview ? <span className="review-flag">Needs review</span> : null}
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
        </div>
      ) : null}
    </div>
  );
}