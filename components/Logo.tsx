import Link from 'next/link';

// Shared between the server-side SiteHeader and its client-side interactive
// half (SiteHeaderClient), and SiteFooter — kept dependency-free (no
// server-only imports) so it's safe in either bundle.
//
// Renders the platform's actual wordmark artwork, `public/brand/certified-
// logo.png`. Background already removed (transparent PNG, via a flood-fill
// + morphological-opening script run once at asset-prep time — see
// components/GoldSeal.tsx's comment for why) — no backdrop chip needed
// anymore, it reads cleanly against both the light and dark header/footer
// surface (app/globals.css's --certified-surface).
export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center" aria-label="Certified Africa home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/certified-logo.png" alt="Certified Africa" className="h-11 w-auto sm:h-12" />
    </Link>
  );
}
