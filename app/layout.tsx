import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

// Platform UI typography (docs/design-system.md §1: "Display/serif... Inter
// for UI sans"). next/font self-hosts these at build time (no external
// request, no layout shift) and exposes them as the same --font-display/
// --font-sans CSS variables app/globals.css already declares fallbacks for
// — nothing was actually loading these fonts before this, so every page was
// silently rendering in system-ui/Georgia instead of the design system's
// intended typefaces.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'Certified Africa', template: '%s · Certified Africa' },
  description:
    'Trust infrastructure for training providers across Africa — branded, verifiable certificates and a public directory of certified individuals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfairDisplay.variable}`}>
      <body>{children}</body>
    </html>
  );
}
