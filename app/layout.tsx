import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { themeBootstrapScript } from '@/lib/theme/theme-script';
import './globals.css';

// Platform UI typography (docs/design-system.md §1: "Display/serif... Inter
// for UI sans"). next/font self-hosts these at build time (no external
// request, no layout shift) and exposes them as the same --font-display/
// --font-sans CSS variables app/globals.css already declares fallbacks for,
// nothing was actually loading these fonts before this, so every page was
// silently rendering in system-ui/Georgia instead of the design system's
// intended typefaces.
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const playfairDisplay = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'Certified Africa', template: '%s · Certified Africa' },
  description:
    'Trust infrastructure for training providers across Africa, issuing branded, verifiable certificates and running a public directory of certified individuals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is scoped to this element only (React only
    // suppresses a mismatch on the node it's set on, not descendants) — it
    // exists because lib/theme/theme-script.ts mutates this exact
    // className (adding/removing "dark") before hydration runs, which is
    // expected and desired, not a real mismatch to warn about.
    <html lang="en" className={`${inter.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
