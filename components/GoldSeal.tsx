/**
 * Certified Africa's mandatory trust mark (docs/design-system.md §5) — browser/web version.
 * Fixed artwork — never recolored to an issuer's brand color, never resized below
 * legibility, never rotated. Reused everywhere the platform represents its own trust
 * mark outside of PDF output: verification page header, "Approved Issuer" badge,
 * marketing site.
 *
 * This is the web counterpart to `lib/certificates/GoldSeal.tsx` (the PDF version,
 * built on @react-pdf/renderer and unusable in a browser). Same disc, gradient,
 * ring, and watermark — but here "CERTIFIED" arcs along the top via a real
 * `<textPath>`, since browsers support it and react-pdf's SVG layer doesn't.
 *
 * `size` is the only prop callers should vary, and only within the design system's
 * ~9%-of-page-width rule for on-certificate contexts; standalone badge/header uses
 * are not held to that ratio.
 *
 * `idPrefix` namespaces the internal `<defs>` ids (gradient, text-arc path) so
 * multiple seals can render on one page (e.g. a verification page header plus a
 * footer badge) without id collisions.
 */
export function GoldSeal({
  size = 112,
  idPrefix = 'certified-gold-seal',
}: {
  size?: number;
  idPrefix?: string;
}) {
  const gradientId = `${idPrefix}-foil`;
  const arcId = `${idPrefix}-arc`;

  return (
    <svg
      viewBox="0 0 260 260"
      width={size}
      height={size}
      role="img"
      aria-label="Certified gold seal"
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FCF3D6" />
          <stop offset="35%" stopColor="#EFCB6E" />
          <stop offset="65%" stopColor="#C9992E" />
          <stop offset="100%" stopColor="#8A6212" />
        </radialGradient>
        {/* Arc for the "CERTIFIED" textPath — semicircle over the top of the disc,
            inset from the outer ring so the lettering sits inside it. */}
        <path id={arcId} d="M 35,130 A 95,95 0 0 1 225,130" fill="none" />
      </defs>

      <circle cx={130} cy={130} r={118} fill={`url(#${gradientId})`} />
      <circle cx={130} cy={130} r={118} fill="none" stroke="#C9992E" strokeWidth={3} opacity={0.35} />
      {/* watermark center — low opacity, sits behind the lettering, not competing with it */}
      <circle cx={130} cy={130} r={58} fill="#FCF3D6" opacity={0.28} />
      <polygon
        points="130,80 142,111 175,111 148,131 158,164 130,145 102,164 112,131 85,111 118,111"
        fill="#5C4009"
        opacity={0.14}
      />
      <text fontSize={26} fontFamily="Georgia, 'Playfair Display', serif" fontWeight={700} fill="#5C4009">
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          CERTIFIED
        </textPath>
      </text>
    </svg>
  );
}
