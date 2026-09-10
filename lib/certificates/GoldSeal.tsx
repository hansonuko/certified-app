import { Image } from '@react-pdf/renderer';

// react-pdf's asset loader always fetches `src` by URL, even for local files
// — a relative path fails server-side because there's no origin to resolve
// it against (same issue lib/certificates/fonts.ts already solved for the
// .ttf files; see that file's own comment for the full explanation).
// Building an absolute URL from NEXT_PUBLIC_APP_URL fixes it identically here.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Certified Africa's mandatory trust mark (docs/design-system.md §5). Fixed
 * artwork — never recolored to an issuer's brand color, never resized below
 * legibility, never rotated. Reused identically across every certificate
 * template. `size` is the only prop templates should vary, and only within
 * the design system's ~9%-of-page-width rule.
 *
 * This is the PDF-only half of the seal — the actual platform artwork,
 * `public/brand/certified-seal.png`. The browser equivalent is
 * `components/GoldSeal.tsx`, which renders the exact same file. Background
 * already removed (transparent PNG, via a flood-fill + morphological-
 * opening script run once at asset-prep time, not at render time) — no
 * runtime cropping needed.
 */
export function GoldSeal({ size = 112 }: { size?: number }) {
  return <Image src={`${APP_URL}/brand/certified-seal.png`} style={{ width: size, height: size, objectFit: 'contain' }} />;
}
