import { getAll } from "@/lib/data";
import { Catalogue } from "./components/Catalogue";

export default function Home() {
  const experiences = getAll();
  const years = experiences.map((e) => e.year);
  const from = Math.min(...years);
  const to = Math.max(...years);

  return (
    <>
      <div className="page-head">
        <h1>Archive</h1>
        <p>
          {experiences.length} residencies, exhibitions and collaborations from {from} to {to}. Open an entry to
          see its details and where the data came from.
        </p>
      </div>
      <Catalogue experiences={experiences} />
    </>
  );
}
