import { type Artist } from "@/lib/schema";

export function ArtistHeader({ artist }: { artist: Artist }) {
  return (
    <div className="artist-header">
      <div className="artist-avatar" aria-hidden="true">
        {artist.profileInitials}
      </div>
      <div>
        <h1 className="artist-name">{artist.name}</h1>
        {artist.location ? <p className="artist-location">{artist.location}</p> : null}
        <p className="artist-bio">{artist.bio}</p>
        {artist.links.length > 0 ? (
          <ul className="artist-links">
            {artist.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}