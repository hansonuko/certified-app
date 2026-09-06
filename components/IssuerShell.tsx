import Link from 'next/link';
import type { IssuerNavItem } from '@/lib/issuer-nav';

/**
 * Issuer dashboard shell (docs/design-system.md §8) — structurally mirrors
 * StaffShell (components/StaffShell.tsx) but themed distinctly: navy
 * sidebar here vs. the staff console's dark-slate, so nobody mistakes
 * which surface they're in.
 */
export function IssuerShell({
  navItems,
  orgName,
  children,
}: {
  navItems: IssuerNavItem[];
  orgName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-certified-navy text-white">
        <div className="p-6 font-display text-xl">Certified</div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-control px-3 py-2 text-sm text-certified-border hover:bg-certified-navy-2"
            >
              <span>{item.label}</span>
              {item.comingSoon ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">soon</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end border-b border-certified-border bg-certified-surface px-6 py-3">
          <span className="text-sm text-certified-ink">{orgName}</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
