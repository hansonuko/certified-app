'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Logo } from './Logo';
import { NAV_LINKS } from './site-nav';
import { ThemeToggle } from './ThemeToggle';
import { signOutAction } from '@/lib/auth/actions';
import type { AccountLink } from '@/lib/auth/account-link';

// The "Apply as an issuer" fill needs its own dark-mode color rather than
// inheriting --certified-navy's vivid blue (app/globals.css) the way
// headings/links/borders do: that value is tuned for blue-on-near-black
// text contrast, and white text on top of it would fall short of WCAG AA
// (~3.2:1). Tailwind's blue-600/700 pair keeps white text comfortably
// AA-compliant (~5:1) while staying the same hue family as the rest of the
// dark theme. Shared so the desktop and mobile-drawer copies of this button
// can't drift from each other.
const PRIMARY_BUTTON =
  'rounded-control bg-certified-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-110 hover:-translate-y-px active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:bg-blue-600 dark:shadow-blue-900/40 dark:hover:bg-blue-500';

export function SiteHeaderClient({ accountLink }: { accountLink: AccountLink }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-40 border-b border-certified-border bg-certified-surface/95 backdrop-blur transition-colors dark:border-white/10 dark:bg-certified-surface/60 dark:shadow-[0_1px_0_0_rgba(120,170,255,0.12)] dark:backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} active={pathname === link.href}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {accountLink ? (
            <>
              <Link
                href={accountLink.href}
                className="rounded-control px-3 py-2 text-sm font-medium text-certified-navy transition hover:bg-certified-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:hover:bg-white/10"
              >
                {accountLink.label}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-control border border-certified-border px-3 py-2 text-sm font-medium text-certified-ink transition hover:border-certified-navy-2 hover:bg-certified-surface-2 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:hover:bg-white/10"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-control px-3 py-2 text-sm font-medium text-certified-navy transition hover:bg-certified-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:hover:bg-white/10"
              >
                Log in
              </Link>
              <Link href="/apply" className={PRIMARY_BUTTON}>
                Apply as an issuer
              </Link>
            </>
          )}
          <div className="ml-1 border-l border-certified-border pl-3 dark:border-white/10">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-control text-certified-navy transition hover:bg-certified-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold dark:hover:bg-white/10"
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="overflow-hidden border-t border-certified-border lg:hidden dark:border-white/10 dark:bg-certified-surface/60 dark:backdrop-blur-xl"
          >
            <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-control px-3 py-3 text-base font-medium text-certified-ink transition hover:bg-certified-surface-2 dark:hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 border-t border-certified-border dark:border-white/10" />
              {accountLink ? (
                <>
                  <Link
                    href={accountLink.href}
                    onClick={() => setOpen(false)}
                    className="rounded-control px-3 py-3 text-base font-medium text-certified-navy transition hover:bg-certified-surface-2 dark:hover:bg-white/10"
                  >
                    {accountLink.label}
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-control px-3 py-3 text-left text-base font-medium text-certified-ink transition hover:bg-certified-surface-2 dark:hover:bg-white/10"
                    >
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-control px-3 py-3 text-base font-medium text-certified-navy transition hover:bg-certified-surface-2 dark:hover:bg-white/10"
                  >
                    Log in
                  </Link>
                  <Link href="/apply" onClick={() => setOpen(false)} className={`${PRIMARY_BUTTON} text-center`}>
                    Apply as an issuer
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`relative py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-certified-gold ${
        active ? 'text-certified-navy' : 'text-certified-muted hover:text-certified-navy'
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-[1px] left-0 h-[2px] w-full bg-certified-gold transition-transform duration-150 ${
          active ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
    </Link>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}
