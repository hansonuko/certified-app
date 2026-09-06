import Link from 'next/link';
import type { StaffRole } from '@/lib/permissions';
import type { StaffNavItem } from '@/lib/staff-nav';

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: 'Admin',
  account_manager: 'Account Manager',
  finance: 'Finance',
};

/**
 * Shared staff console shell (docs/design-system.md §8): a dark-slate
 * sidebar — deliberately distinct from the issuer dashboard's navy one, so
 * staff never mistake which surface they're in — plus a top bar showing
 * the logged-in staff member's name and role badge (§9). Desktop-only
 * layout for now (fixed sidebar); the responsive collapse/drawer behavior
 * described in §8 is a polish pass, not required by docs/build-phases.md
 * Phase 2.
 */
export function StaffShell({
  navItems,
  role,
  name,
  children,
}: {
  navItems: StaffNavItem[];
  role: StaffRole;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-100">
        <div className="p-6 font-display text-xl">Certified Africa</div>
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-control px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end gap-3 border-b border-certified-border bg-certified-surface px-6 py-3">
          <span className="text-sm text-certified-ink">{name}</span>
          <span className="rounded-full bg-certified-surface-2 px-3 py-1 text-xs font-medium text-certified-navy">
            {ROLE_LABEL[role]}
          </span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
