'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { IssuerNavItem } from '@/lib/issuer-nav';
import { IconButton } from '@/components/ui/IconButton';

/**
 * Issuer dashboard shell (docs/design-system.md §8) — structurally mirrors
 * StaffShell (components/StaffShell.tsx), including its responsive
 * collapse/drawer behavior (see that file's header comment for the full
 * reasoning, including why "icon-only" is a first-letter circle rather
 * than a real icon glyph). Themed distinctly: navy sidebar here vs. the
 * staff console's dark-slate, so nobody mistakes which surface they're in.
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 bg-certified-navy text-white lg:block">
        <SidebarContent navItems={navItems} variant="full" />
      </aside>

      <aside className="hidden w-16 shrink-0 bg-certified-navy text-white md:block lg:hidden">
        <SidebarContent navItems={navItems} variant="icon" />
      </aside>

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
              className="relative h-full w-64 bg-certified-navy text-white"
            >
              <div className="flex justify-end p-2">
                <IconButton label="Close menu" onClick={() => setDrawerOpen(false)} className="text-certified-border">
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
          <span className="text-sm text-certified-ink">{orgName}</span>
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
  navItems: IssuerNavItem[];
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
                ? 'flex h-10 w-10 items-center justify-center self-center rounded-full text-xs font-semibold text-certified-border transition-colors duration-150 hover:bg-certified-navy-2'
                : 'flex items-center justify-between rounded-control px-3 py-2 text-sm text-certified-border transition-colors duration-150 hover:bg-certified-navy-2'
            }
          >
            {variant === 'icon' ? (
              <>
                <span aria-hidden="true">{item.label.charAt(0)}</span>
                <span className="sr-only">{item.label}</span>
              </>
            ) : (
              <>
                <span>{item.label}</span>
                {item.comingSoon ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">soon</span>
                ) : null}
              </>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
