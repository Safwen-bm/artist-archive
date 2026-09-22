import type { Experience } from "@/lib/schema";

const TONES = ["#b9c6d8", "#d8bcc7", "#c3d5bd", "#cbc6dc"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Shown when no image could be found. Generated from the record itself. */
export function Placeholder({
  experience,
  wide = false,
}: {
  experience: Pick<Experience, "id" | "year" | "institution" | "city">;
  wide?: boolean;
}) {
  const tone = TONES[hash(experience.id) % TONES.length];
  const [w, h] = wide ? [400, 300] : [400, 500];
  const label = [experience.institution, experience.city].filter(Boolean).join(", ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`No image yet for ${label || "this entry"}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width={w} height={h} fill={tone} />
      <text x="24" y={h - 60} fontFamily="Georgia, serif" fontSize="96" fill="#1b1c1e" fillOpacity="0.85">
        {experience.year}
      </text>
      <text x="26" y={h - 28} fontFamily="Helvetica, Arial, sans-serif" fontSize="16" fill="#1b1c1e" fillOpacity="0.7">
        {label}
      </text>
    </svg>
  );
}
