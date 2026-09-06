import { Image } from '@react-pdf/renderer';

/**
 * Issuer logo (docs/design-system.md §4 shared elements: "Issuer logo +
 * name, top area" — every template was supposed to show this, but none
 * actually rendered brand.logoUrl before docs/build-phases.md Phase 3
 * wired up the upload). Renders nothing when no logo is set — an issuer
 * without a logo yet just gets the name text, which is how every template
 * already handled it.
 */
export function IssuerLogo({
  logoUrl,
  size = 32,
  style,
}: {
  logoUrl?: string | null;
  size?: number;
  style?: Record<string, unknown>;
}) {
  if (!logoUrl) return null;
  return <Image src={logoUrl} style={{ width: size, height: size, objectFit: 'contain', ...style }} />;
}
