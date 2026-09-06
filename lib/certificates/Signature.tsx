import { Image, Text } from '@react-pdf/renderer';
import { SERIF } from './fonts';

/**
 * Shared signature block (docs/build-phases.md Phase 3: "signature (typed
 * in a script font or uploaded image)") — every template renders whichever
 * the issuer picked in the brand wizard through this one component instead
 * of hand-rolling the choice, same pattern as GoldSeal/VerificationQr.
 *
 * "Typed" is the italic serif treatment already used across every
 * template — Playfair Display italic reads as a script/cursive signature
 * without needing an actual script font. "Uploaded image" renders the
 * issuer's own signature image instead, sized to roughly the same visual
 * weight as the text version.
 */
export function Signature({
  signatureImageUrl,
  signatoryName,
  color = '#0F172A',
  fontSize = 18,
}: {
  signatureImageUrl?: string | null;
  signatoryName: string;
  color?: string;
  fontSize?: number;
}) {
  if (signatureImageUrl) {
    return <Image src={signatureImageUrl} style={{ height: fontSize * 2.2, objectFit: 'contain' }} />;
  }

  return (
    <Text style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize, color }}>{signatoryName}</Text>
  );
}
