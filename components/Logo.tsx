import Link from 'next/link';
import { GoldSeal } from './GoldSeal';

// Shared between the server-side SiteHeader and its client-side interactive
// half (SiteHeaderClient) — kept dependency-free (no server-only imports) so
// it's safe in either bundle.
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Certified Africa home">
      <GoldSeal size={28} idPrefix="site-header-seal" />
      <span className="font-display text-lg font-bold text-certified-navy">Certified Africa</span>
    </Link>
  );
}
