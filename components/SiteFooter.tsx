import Link from 'next/link';
import { Logo } from './Logo';
import { ApplyStatusCallout } from './ApplyStatusCallout';

// Public shell footer (docs/sitemap.md §8: "footer (legal, about, contact)").
// The link columns below are static, but the "become an issuer" banner
// (ApplyStatusCallout) is auth/application-status aware — it used to be a
// hardcoded pitch shown identically to every visitor regardless of whether
// they'd already applied or were already an approved issuer, which is what
// this file carries the single copy of now rather than every page that
// wants a "ready to apply?" moment hand-rolling its own static version.
const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { href: '/how-it-works', label: 'How it works' },
      { href: '/directory', label: 'Directory' },
      { href: '/verify', label: 'Verify a certificate' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    heading: 'Who it’s for',
    links: [
      { href: '/for-businesses', label: 'Training centres & trainers' },
      { href: '/for-individuals', label: 'Employers & the public' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/security', label: 'Security & trust' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
    ],
  },
];

export async function SiteFooter() {
  return (
    <footer className="border-t border-certified-border bg-certified-surface transition-colors dark:border-white/10 dark:bg-certified-surface/70 dark:backdrop-blur-xl">
      <ApplyStatusCallout />

      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-5">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Logo />
          <p className="text-sm text-certified-muted">Every certificate, verifiable in seconds.</p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-certified-ink">{col.heading}</p>
            {col.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-certified-muted transition hover:text-certified-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-certified-border dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-2 px-4 py-6 text-xs text-certified-muted sm:flex-row sm:px-6">
          <p>&copy; {new Date().getFullYear()} Certified Africa. All rights reserved.</p>
          <p>Certified Africa operates across the African continent.</p>
        </div>
      </div>
    </footer>
  );
}
