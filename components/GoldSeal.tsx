/**
 * Certified Africa's mandatory trust mark (docs/design-system.md §5) —
 * browser/web version. Fixed artwork — never recolored to an issuer's brand
 * color, never resized below legibility, never rotated. Reused everywhere
 * the platform represents its own trust mark outside of PDF output:
 * verification page header, "Approved Issuer" badge, marketing site.
 *
 * Renders the platform's actual seal artwork, `public/brand/certified-
 * seal.png` — the exact same file `lib/certificates/GoldSeal.tsx` embeds in
 * PDF output. Background already removed (transparent PNG, via a
 * flood-fill + morphological-opening script run once at asset-prep time,
 * not at render time) — reads cleanly on any surface, light or dark,
 * without needing a circular crop or backdrop chip.
 *
 * `idPrefix` is a legacy prop from the old hand-drawn-SVG version, which
 * needed it to namespace `<defs>` ids so multiple seals could render on one
 * page without collisions — not needed now that this is a plain image, but
 * kept in the signature so every existing call site keeps compiling
 * unchanged.
 */
export function GoldSeal({
  size = 112,
  idPrefix: _idPrefix,
}: {
  size?: number;
  idPrefix?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/certified-seal.png"
      alt="Certified gold seal"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
