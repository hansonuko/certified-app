import { getApplyStatus } from '@/lib/auth/apply-status';
import { PrimaryLink, SecondaryLink } from './marketing/shared';

/**
 * The one "become an issuer" callout every public page shows, via
 * components/SiteFooter.tsx — replaces what used to be a static,
 * always-the-same-pitch block hardcoded there, plus two more differently-
 * worded copies hand-rolled on individual marketing pages
 * (app/(marketing)/page.tsx, for-businesses/page.tsx) that stacked right
 * above the footer's own, producing the "same heading twice" duplication.
 * Those page-level copies were removed outright rather than replaced with
 * a second instance of this component — the footer's is the only one, on
 * every page.
 *
 * Auth/application-status aware via lib/auth/apply-status.ts: an
 * anonymous visitor or a signed-in user with no organization yet sees the
 * generic pitch; someone mid-review or asked for more information sees
 * that instead of being told to "apply" a second time; a rejected
 * applicant is pointed at their status page rather than the pitch as if
 * nothing happened; an already-approved issuer sees nothing at all
 * (renders null, removing the band along with it) since there is nothing
 * useful to pitch them here.
 */
export async function ApplyStatusCallout() {
  const status = await getApplyStatus();

  if (status.state === 'approved') return null;

  let heading: string;
  let body: string;
  let primary: { href: string; label: string };
  const secondary = { href: '/directory', label: 'Browse certified talent' };

  switch (status.state) {
    case 'anonymous':
    case 'no-org':
      heading = 'Not yet Certified Africa approved? Apply, get approved, get seen.';
      body =
        'Training centres, vocational institutes, and personal trainers who join Certified Africa give every trainee they certify continent wide visibility, a verifiable credential, and a real chance to be found and hired for their skills and portfolio, wherever they are in Africa.';
      primary = { href: '/apply', label: 'Apply to become an issuer' };
      break;
    case 'pending':
      heading = `${status.displayName}'s application is in review.`;
      body =
        "You've already applied — an agent is reviewing it now. We'll notify you as soon as there's a decision, or check the status page any time.";
      primary = { href: '/apply/status', label: 'View application status' };
      break;
    case 'more_info_requested':
      heading = `${status.displayName}'s application needs a bit more information.`;
      body = "An agent has asked for more information before this can move forward — check the status page for their comment.";
      primary = { href: '/apply/status', label: 'View application status' };
      break;
    case 'rejected':
      heading = `${status.displayName}'s application wasn't approved.`;
      body = "You can see the reason and reapply any time — there's no cooldown period.";
      primary = { href: '/apply/status', label: 'View application status' };
      break;
  }

  return (
    <div className="border-b border-certified-border dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-12 text-center sm:px-6">
        <p className="font-display text-2xl text-certified-navy sm:text-3xl">{heading}</p>
        <p className="max-w-2xl text-certified-muted">{body}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryLink href={primary.href}>{primary.label}</PrimaryLink>
          <SecondaryLink href={secondary.href}>{secondary.label}</SecondaryLink>
        </div>
      </div>
    </div>
  );
}
