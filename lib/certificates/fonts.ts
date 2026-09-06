// Registers the certificate typography (Playfair Display serif + Inter sans,
// docs/design-system.md §1) with react-pdf. The .ttf files live in
// /public/fonts (docs/build-phases.md Phase 3).
//
// react-pdf's font loader always fetches src by URL/path, even for local
// files — a browser-side render (the brand wizard's <PDFViewer>, Phase 3)
// can get away with a page-relative path like '/fonts/Inter-Regular.ttf'
// because the browser resolves it against the current origin. Server-side
// (a Vercel function rendering a certificate PDF at issuance, Phase 4) has no
// such origin to resolve against — a relative path there fails to fetch and
// react-pdf silently falls back to Helvetica/Times-Roman. Building an
// absolute URL from NEXT_PUBLIC_APP_URL fixes both cases identically: it's
// still same-origin from a browser's perspective, and it's a real fetchable
// URL from Node.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function fontUrl(filename: string): string {
  return `${APP_URL}/fonts/${filename}`;
}

import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Playfair Display',
  fonts: [
    { src: fontUrl('PlayfairDisplay-Regular.ttf'), fontWeight: 400 },
    { src: fontUrl('PlayfairDisplay-Medium.ttf'), fontWeight: 500 },
    { src: fontUrl('PlayfairDisplay-Bold.ttf'), fontWeight: 700 },
    { src: fontUrl('PlayfairDisplay-Italic.ttf'), fontWeight: 500, fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'Inter',
  fonts: [
    { src: fontUrl('Inter-Regular.ttf'), fontWeight: 400 },
    { src: fontUrl('Inter-Medium.ttf'), fontWeight: 500 },
    { src: fontUrl('Inter-SemiBold.ttf'), fontWeight: 600 },
    { src: fontUrl('Inter-Bold.ttf'), fontWeight: 700 },
  ],
});

export const SERIF = 'Playfair Display';
export const SANS = 'Inter';
