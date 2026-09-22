export function Stats({
  stats,
}: {
  stats: { total: number; countries: number; institutions: number; yearFrom: number | null; yearTo: number | null };
}) {
  const items = [
    { label: "Experiences", value: stats.total },
    { label: "Countries", value: stats.countries },
    { label: "Institutions", value: stats.institutions },
    { label: "Span", value: stats.yearFrom && stats.yearTo ? `${stats.yearFrom}–${stats.yearTo}` : "—" },
  ];
  return (
    <dl className="stats">
      {items.map((it) => (
        <div key={it.label} className="stat">
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}