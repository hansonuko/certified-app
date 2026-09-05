import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Certified',
  description:
    'Trust infrastructure for training providers — branded, verifiable certificates and a public directory of certified individuals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
