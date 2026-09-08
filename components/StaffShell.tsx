'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { StaffRole } from '@/lib/permissions';
import type { StaffNavItem } from '@/lib/staff-nav';
import { IconButton } from '@/components/ui/IconButton';
import { signOutStaffAction } from '@/lib/auth/actions';

const ROLE_LABEL: Record<StaffRole, string> = {
  admin: 'Admin',
  account_manager: 'Account Manager',
  finance: 'Finance',
};

/**
 * Shared staff console shell (docs/design-system.md §8): a dark-slate
 * sidebar — deliberately distinct from the issuer dashboard's navy one, so
 * staff never mistake which surface they're in — plus a top bar showing
 * the logged-in staff member's name and role badge (§9).
 *
 * Responsive per §8: desktop (≥1024px) keeps the original fixed 240px
 * sidebar with full labels; tablet (768–1023px) collapses it to icon-only
 * (64px); mobile (<768px) moves it into a slide-in drawer triggered by a
 * hamburger button in the top bar (Framer Motion slide+fade, matching §2's
 * modal/drawer spec, reduced-motion aware via useReducedMotion).
 *
 * "Icon-only" is a first-letter circle rather than a real icon glyph — no
 * icon library is a dependency in this project yet (adopting one, and
 * picking a full icon set for every nav item, is a separate decision, not
 * part of this pass), so this is the lightweight substitute. Each item
 * still carries a `title` attribute (native hover tooltip) and an sr-only
 * label for screen readers; a fully spec-accurate custom Tooltip (§7's
 * 400ms-delay, keyboard-triggered row) is deferred along with the rest of
 * the per-page interaction-state retrofit.
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen">
      {/* Desktop (≥1024px): full sidebar, always visible. */}
      <aside className="hidden w-60 shrink-0 bg-slate-900 text-slate-100 lg:block">
        <SidebarContent navItems={navItems} variant="full" />
      </aside>

      {/* Tablet (768–1023px): icon-only rail, always visible. */}
      <aside className="hidden w-16 shrink-0 bg-slate-900 text-slate-100 md:block lg:hidden">
        <SidebarContent navItems={navItems} variant="icon" />
      </aside>

      {/* Mobile (<768px): slide-in drawer, triggered by the top bar's hamburger. */}
      <AnimatePresence>
        {drawerOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.15 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: reduceMotion ? 0 : '-100%', opacity: reduceMotion ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : '-100%', opacity: reduceMotion ? 0 : 1 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.2, ease: 'easeOut' }}
              className="relative h-full w-64 bg-slate-900 text-slate-100"
            >
              <div className="flex justify-end p-2">
                <IconButton label="Close menu" onClick={() => setDrawerOpen(false)} className="text-slate-300">
                  ✕
                </IconButton>
              </div>
              <SidebarContent navItems={navItems} variant="full" onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-certified-border bg-certified-surface px-6 py-3 md:justify-end">
          <IconButton label="Open menu" onClick={() => setDrawerOpen(true)} className="text-certified-navy md:hidden">
            ☰
          </IconButton>
          <div className="flex items-center gap-3">
            <span className="text-sm text-certified-ink">{name}</span>
            <span className="rounded-full bg-certified-surface-2 px-3 py-1 text-xs font-medium text-certified-navy">
              {ROLE_LABEL[role]}
            </span>
            <form action={signOutStaffAction}>
              <button type="submit" className="text-sm text-certified-navy underline">
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  navItems,
  variant,
  onNavigate,
}: {
  navItems: StaffNavItem[];
  variant: 'full' | 'icon';
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className={`p-6 font-display ${variant === 'icon' ? 'text-center text-sm' : 'text-xl'}`}>
        {variant === 'icon' ? 'CA' : 'Certified Africa'}
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={variant === 'icon' ? item.label : undefined}
            className={
              variant === 'icon'
                ? 'flex h-10 w-10 items-center justify-center self-center rounded-full text-xs font-semibold text-slate-200 transition-colors duration-150 hover:bg-slate-800'
                : 'rounded-control px-3 py-2 text-sm text-slate-200 transition-colors duration-150 hover:bg-slate-800'
            }
          >
            {variant === 'icon' ? (
              <>
                <span aria-hidden="true">{item.label.charAt(0)}</span>
                <span className="sr-only">{item.label}</span>
              </>
            ) : (
              item.label
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
