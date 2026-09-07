import Link from 'next/link';

// Small shared primitives for the marketing pages (app/(marketing)/*) —
// keeps 11 pages visually consistent without re-deriving the same container
// widths / heading treatment / button styles on every one. Interaction
// states follow docs/design-system.md §7 (primary/secondary button rows).
// Dark-mode treatment is the "blue theme, glass" look (app/globals.css):
// translucent surfaces + backdrop-blur rather than a flat inverted palette.

export function Container({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-certified-gold">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-3xl text-certified-navy sm:text-4xl">{title}</h1>
      {subtitle ? <p className="text-lg text-certified-muted">{subtitle}</p> : null}
    </div>
  );
}

// White text on the raw --certified-navy dark-mode value doesn't clear WCAG
// AA (that value is tuned for text-on-dark contrast, not fill-with-white-
// text-on-top) — same reasoning and same blue-600/700 substitute as
// components/SiteHeaderClient.tsx's PRIMARY_BUTTON. Kept in sync by hand
// since it's two small components, not worth a shared constant across files.
export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-control bg-certified-navy px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:-translate-y-px hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:bg-blue-600 dark:shadow-blue-900/40 dark:hover:bg-blue-500"
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-control border border-certified-navy bg-certified-surface px-5 py-3 text-sm font-medium text-certified-navy transition hover:border-certified-navy-2 hover:bg-certified-surface-2 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:bg-white/5 dark:backdrop-blur-sm dark:hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-certified-gold">{eyebrow}</p>
      ) : null}
      <h2 className="font-display text-2xl text-certified-navy sm:text-3xl">{title}</h2>
      {subtitle ? <p className="text-certified-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-card border border-certified-border bg-certified-surface p-6 transition hover:shadow-sm dark:bg-white/[0.04] dark:backdrop-blur-xl dark:hover:bg-white/[0.06] dark:hover:shadow-[0_8px_32px_rgba(76,141,255,0.12)] ${className}`}
    >
      {children}
    </div>
  );
}
