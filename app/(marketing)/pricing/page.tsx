import type { Metadata } from 'next';
import { Container, PageHeader, PrimaryLink, Card } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Certified Africa is free for approved issuers today. No hidden tiers, no "contact us" pricing.',
};

export default function PricingPage() {
  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-20">
      <PageHeader eyebrow="Pricing" title="Free for approved issuers, today" />

      <Card className="flex max-w-xl flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="font-display text-4xl text-certified-navy">$0</p>
          <p className="text-certified-muted">/ month</p>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-certified-ink">
          <li>&bull; Full issuer dashboard, programs, single and bulk issuance</li>
          <li>&bull; All ten certificate templates, brand configuration included</li>
          <li>&bull; Unlimited public verification lookups for anyone you certify</li>
          <li>&bull; A public directory profile for your organization and trainees</li>
          <li>&bull; Contact-gated leads from the directory, routed straight to you</li>
        </ul>
        <p className="text-sm text-certified-muted">
          Requires an approved application, see <a className="underline" href="/for-businesses">for training centres &amp; trainers</a>.
        </p>
        <PrimaryLink href="/apply">Apply as a trainer or business</PrimaryLink>
      </Card>

      <div className="max-w-2xl rounded-card border border-dashed border-certified-border bg-certified-surface-2 p-6 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <p className="font-semibold text-certified-navy">What's coming later</p>
        <p className="mt-2 text-sm text-certified-muted">
          Future premium tiers may add things like priority directory placement, advanced issuance analytics, or a
          custom domain for your public page, none of that exists yet, and nothing above will move behind a paywall
          retroactively. This page will be updated with real numbers if and when that ships, not a "contact us for
          pricing" placeholder.
        </p>
      </div>
    </Container>
  );
}
