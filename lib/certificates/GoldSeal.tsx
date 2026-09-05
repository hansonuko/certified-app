import React from 'react';
import { Svg, Circle, Polygon, Text, Defs, RadialGradient, Stop } from '@react-pdf/renderer';

/**
 * Certified's mandatory trust mark (docs/design-system.md §5). Fixed artwork — never
 * recolored to an issuer's brand color, never resized below legibility, never rotated.
 * Reused identically across every certificate template. `size` is the only prop
 * templates should vary, and only within the design system's ~9%-of-page-width rule.
 *
 * Note: this is the PDF-only half of the seal. There is no standalone SVG
 * asset file; the browser equivalent is `components/GoldSeal.tsx`, kept
 * visually in sync with this one by hand (same disc/gradient/watermark).
 * This component is built on @react-pdf/renderer's <Svg> primitives, so it
 * can't render in a browser as-is — that's why the web version is a
 * separate component. react-pdf's SVG layer also doesn't support
 * <textPath>, so "CERTIFIED" is straight, centered, bold lettering here
 * rather than arced (the web version arcs it). See docs/design-system.md §5.
 */
export function GoldSeal({ size = 112 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 260 260" style={{ width: size, height: size }}>
      <Defs>
        <RadialGradient id="sealFoil" cx="35%" cy="30%" r="75%">
          <Stop offset="0%" stopColor="#FCF3D6" />
          <Stop offset="35%" stopColor="#EFCB6E" />
          <Stop offset="65%" stopColor="#C9992E" />
          <Stop offset="100%" stopColor="#8A6212" />
        </RadialGradient>
      </Defs>
      <Circle cx={130} cy={130} r={118} fill="url(#sealFoil)" />
      <Circle cx={130} cy={130} r={118} fill="none" stroke="#C9992E" strokeWidth={3} opacity={0.35} />
      {/* watermark center — low opacity, sits behind the lettering, not competing with it */}
      <Circle cx={130} cy={130} r={58} fill="#FCF3D6" opacity={0.28} />
      <Polygon
        points="130,80 142,111 175,111 148,131 158,164 130,145 102,164 112,131 85,111 118,111"
        fill="#5C4009"
        opacity={0.14}
      />
      <Text x={130} y={104} textAnchor="middle" fontSize={26} fontFamily="Helvetica-Bold" fill="#5C4009">
        CERTIFIED
      </Text>
    </Svg>
  );
}
