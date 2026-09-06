'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { GoldSeal } from '@/components/GoldSeal';

export type VerificationOutcome =
  | { kind: 'rate_limited'; retryAfterSeconds: number }
  | { kind: 'not_found'; publicId: string }
  | { kind: 'integrity_failed'; publicId: string }
  | {
      kind: 'result';
      displayStatus: 'valid' | 'revoked' | 'expired';
      traineeName: string;
      programTitle: string;
      issuerDisplayName: string;
      completionDate: string;
      expiryDate: string | null;
      grade: string | null;
      publicId: string;
      pdfUrl: string | null;
      revokedReason: string | null;
      revokedAt: string | null;
    };

// The animated reveal (docs/design-system.md §2 — "the single most important
// animated moment in the product"): seal spring-scales in, a checkmark
// (valid) or an X (revoked/integrity-failed) draws itself via pathLength,
// then the status badge fades in last with its role color. Every animation
// respects prefers-reduced-motion (useReducedMotion) by collapsing to an
// instant, opacity-only transition — never disabling the content itself
// (docs/design-system.md §2). Status is never conveyed by color alone: an
// icon + text label always accompanies the badge (docs/design-system.md
// §10).
export function VerificationReveal({ outcome }: { outcome: VerificationOutcome }) {
  const reduceMotion = useReducedMotion();

  if (outcome.kind === 'rate_limited') {
    return (
      <Shell>
        <p className="text-lg text-certified-ink">Too many verification requests from this location.</p>
        <p className="text-certified-muted">Try again in about {outcome.retryAfterSeconds} seconds.</p>
      </Shell>
    );
  }

  if (outcome.kind === 'not_found') {
    return (
      <Shell>
        <StatusIcon kind="unknown" reduceMotion={!!reduceMotion} />
        <p className="text-lg text-certified-ink">
          No certificate found for <span className="font-mono">{outcome.publicId}</span>.
        </p>
        <p className="text-certified-muted">Double-check the ID, or scan the QR code directly.</p>
      </Shell>
    );
  }

  if (outcome.kind === 'integrity_failed') {
    return (
      <Shell>
        <StatusIcon kind="danger" reduceMotion={!!reduceMotion} />
        <Badge label="Integrity check failed" tone="danger" reduceMotion={!!reduceMotion} />
        <p className="text-certified-muted">
          This certificate record (<span className="font-mono">{outcome.publicId}</span>) does not match its stored
          signature and cannot be trusted as-is. This does not necessarily mean the certificate is fake — please
          contact Certified support with this ID.
        </p>
      </Shell>
    );
  }

  const { displayStatus } = outcome;
  const tone = displayStatus === 'valid' ? 'success' : displayStatus === 'expired' ? 'warning' : 'danger';
  const label = displayStatus === 'valid' ? 'Valid' : displayStatus === 'expired' ? 'Expired' : 'Revoked';

  return (
    <Shell>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 220, damping: 20 }}
        className="flex items-center gap-3"
      >
        <GoldSeal size={72} idPrefix={`verify-${outcome.publicId}`} />
        <span className="text-left">
          <span className="block text-xs uppercase tracking-wide text-certified-muted">Approved Issuer</span>
          <span className="font-display text-lg text-certified-navy">{outcome.issuerDisplayName}</span>
        </span>
      </motion.div>

      <StatusIcon kind={displayStatus === 'valid' ? 'success' : displayStatus === 'expired' ? 'warning' : 'danger'} reduceMotion={!!reduceMotion} />

      <Badge label={label} tone={tone} reduceMotion={!!reduceMotion} />

      <div className="flex flex-col gap-1">
        <p className="font-display text-2xl text-certified-ink">{outcome.traineeName}</p>
        <p className="text-certified-muted">has completed</p>
        <p className="font-display text-xl text-certified-navy">{outcome.programTitle}</p>
      </div>

      <dl className="grid w-full grid-cols-2 gap-3 text-sm text-certified-muted">
        <div>
          <dt className="text-xs uppercase tracking-wide">Completed</dt>
          <dd className="text-certified-ink">{outcome.completionDate}</dd>
        </div>
        {outcome.grade ? (
          <div>
            <dt className="text-xs uppercase tracking-wide">Grade</dt>
            <dd className="text-certified-ink">{outcome.grade}</dd>
          </div>
        ) : null}
        {outcome.expiryDate ? (
          <div>
            <dt className="text-xs uppercase tracking-wide">Expires</dt>
            <dd className="text-certified-ink">{outcome.expiryDate}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide">Certificate ID</dt>
          <dd className="font-mono text-certified-ink">{outcome.publicId}</dd>
        </div>
      </dl>

      {displayStatus === 'revoked' ? (
        <p className="rounded-control border border-certified-danger/30 bg-certified-danger/5 p-3 text-sm text-certified-danger">
          This certificate was revoked{outcome.revokedAt ? ` on ${outcome.revokedAt.slice(0, 10)}` : ''}
          {outcome.revokedReason ? `: ${outcome.revokedReason}` : '.'}
        </p>
      ) : null}

      {outcome.pdfUrl ? (
        <a href={outcome.pdfUrl} target="_blank" rel="noreferrer" className="text-sm text-certified-navy underline">
          View certificate PDF
        </a>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center gap-6 p-8 text-center">
      <Link href="/verify" className="text-sm text-certified-muted underline">
        Verify another certificate
      </Link>
      {children}
    </main>
  );
}

function Badge({
  label,
  tone,
  reduceMotion,
}: {
  label: string;
  tone: 'success' | 'warning' | 'danger';
  reduceMotion: boolean;
}) {
  const toneClass = {
    success: 'bg-certified-success/10 text-certified-success',
    warning: 'bg-certified-warning/10 text-certified-warning',
    danger: 'bg-certified-danger/10 text-certified-danger',
  }[tone];

  return (
    <motion.span
      role="status"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : 0.35, duration: reduceMotion ? 0.1 : 0.25 }}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold ${toneClass}`}
    >
      {label}
    </motion.span>
  );
}

// Icon + color together (never color alone, docs/design-system.md §10). The
// checkmark/X stroke draws itself via `pathLength` (framer-motion animates
// SVG path length directly) — the "checkmark draws in" moment design-system
// §2 calls out specifically.
function StatusIcon({ kind, reduceMotion }: { kind: 'success' | 'warning' | 'danger' | 'unknown'; reduceMotion: boolean }) {
  const stroke = { success: '#15803D', warning: '#B45309', danger: '#B91C1C', unknown: '#6B7280' }[kind];
  const pathTransition = reduceMotion ? { duration: 0.1 } : { duration: 0.4, delay: 0.15, ease: 'easeOut' as const };

  return (
    <svg width={56} height={56} viewBox="0 0 56 56" role="img" aria-label={kind === 'success' ? 'Verified' : kind === 'unknown' ? 'Not found' : 'Not valid'}>
      <circle cx={28} cy={28} r={26} fill="none" stroke={stroke} strokeWidth={2} opacity={0.25} />
      {kind === 'success' ? (
        <motion.path
          d="M16 29l8 8 16-18"
          fill="none"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={pathTransition}
        />
      ) : kind === 'unknown' ? (
        <text x={28} y={35} textAnchor="middle" fontSize={26} fill={stroke}>
          ?
        </text>
      ) : (
        <>
          <motion.path
            d="M18 18l20 20"
            stroke={stroke}
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition}
          />
          <motion.path
            d="M38 18l-20 20"
            stroke={stroke}
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ ...pathTransition, delay: (pathTransition.delay ?? 0) + 0.1 }}
          />
        </>
      )}
    </svg>
  );
}
