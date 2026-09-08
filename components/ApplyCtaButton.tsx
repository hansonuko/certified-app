import { getApplyStatus } from '@/lib/auth/apply-status';
import { PrimaryLink } from './marketing/shared';

/**
 * A single inline "Apply..." button that hides itself once the visitor has
 * already applied (pending/more_info_requested/rejected/approved) — same
 * lib/auth/apply-status.ts check as the shared footer callout
 * (components/ApplyStatusCallout.tsx), just for the smaller, single-button
 * CTAs scattered across individual marketing pages (pricing, how-it-works,
 * about) rather than that component's full pitch block. An approved
 * issuer, or anyone mid-review, should never be invited to apply again
 * anywhere on the site — this is the reusable piece for "anywhere" that
 * isn't the footer.
 */
export async function ApplyCtaButton({ href = '/apply', children }: { href?: string; children: React.ReactNode }) {
  const status = await getApplyStatus();
  if (status.state !== 'anonymous' && status.state !== 'no-org') return null;
  return <PrimaryLink href={href}>{children}</PrimaryLink>;
}
