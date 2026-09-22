import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artist archive, prototype",
  description:
    "A browsable archive built from an artist's CV: residencies, exhibitions and collaborations as individual entries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            Artist archive
          </Link>
          <nav aria-label="Main">
            <Link href="/">Catalogue</Link>
            <Link href="/method">How it was made</Link>
          </nav>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer wrap">
          Prototype. Entries were extracted from a raw CV with AI and flagged for human review.
        </footer>
      </body>
    </html>
  );
}
