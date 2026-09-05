// Registers the certificate typography (Playfair Display serif + Inter sans,
// docs/design-system.md §1) with react-pdf. react-pdf needs real font FILES, not a
// <link> tag — drop the .ttf files below into /public/fonts (or point src at wherever
// you're serving them from) and every template picks them up automatically.
//
// Until the files are added this is a no-op at render time and react-pdf silently
// falls back to its built-in Helvetica/Times-Roman, so nothing breaks — text just
// isn't on-brand yet. Import this module once per template (side-effect import) rather
// than calling Font.register redundantly in every file.
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Playfair Display',
  fonts: [
    { src: '/fonts/PlayfairDisplay-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/PlayfairDisplay-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/PlayfairDisplay-Bold.ttf', fontWeight: 700 },
    { src: '/fonts/PlayfairDisplay-Italic.ttf', fontWeight: 500, fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Inter-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
  ],
});

export const SERIF = 'Playfair Display';
export const SANS = 'Inter';
