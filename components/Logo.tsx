import Link from 'next/link';

// Shared between the server-side SiteHeader and its client-side interactive
// half (SiteHeaderClient), and SiteFooter — kept dependency-free (no
// server-only imports) so it's safe in either bundle.
//
// Renders the platform's actual wordmark artwork, `public/brand/certified-
// logo.jpg`. The source image sits on a light backdrop rather than a
// transparent one, which would show as a visible seam on the header/footer's
// dark-mode surface (app/globals.css' --certified-surface flips to near-
// black) — wrapped in a small white chip so the logo reads cleanly against
// either theme instead of floating a mismatched rectangle.
export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center" aria-label="Certified Africa home">
      <span className="inline-flex items-center rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/certified-logo.jpg" alt="Certified Africa" className="h-8 w-auto sm:h-9" />
      </span>
    </Link>
  );
}
