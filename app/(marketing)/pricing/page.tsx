import type { Metadata } from 'next';
import { Container, PageHeader, PrimaryLink, Card } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Becoming an approved Certified Africa issuer is free, forever. Certificates are ₦1,000 per credit, with volume discounts.',
};

export default function PricingPage() {
  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-20">
      <PageHeader eyebrow="Pricing" title="Free to join. Pay only for what you issue." />

      <Card className="flex max-w-xl flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="font-display text-4xl text-certified-navy">$0</p>
          <p className="text-certified-muted">to register, get approved, and stay approved — always</p>
        </div>
        <ul className="flex flex-col gap-2 text-sm text-certified-ink">
          <li>&bull; Full issuer dashboard, program management, brand configuration</li>
          <li>&bull; All ten certificate templates included</li>
          <li>&bull; Unlimited public verification lookups for anyone you certify</li>
          <li>&bull; A public directory profile for your organization and trainees</li>
          <li>&bull; Contact-gated leads from the directory, routed straight to you</li>
        </ul>
        <p className="text-sm text-certified-muted">
          Requires an approved application, see <a className="underline" href="/for-businesses">for training centres &amp; trainers</a>.
        </p>
        <PrimaryLink href="/apply">Apply as a trainer or business</PrimaryLink>
      </Card>

      <Card className="flex max-w-xl flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <p className="font-display text-4xl text-certified-navy">&#8358;1,000</p>
          <p className="text-certified-muted">per certificate issued (or the local-currency equivalent elsewhere in Africa)</p>
        </div>
        <p className="text-sm text-certified-ink">
          Top up a certificate-credit balance in your dashboard via Flutterwave or Paystack, and one credit is spent
          per certificate — single-entry or bulk CSV cohorts alike. Volume discounts apply automatically:
        </p>
        <ul className="flex flex-col gap-2 text-sm text-certified-ink">
          <li>&bull; 1 credit — &#8358;1,000/credit</li>
          <li>&bull; 2&ndash;19 credits — 30% off, &#8358;700/credit</li>
          <li>&bull; 20+ credits — 50% off, &#8358;500/credit (20 credits = &#8358;10,000)</li>
        </ul>
        <p className="text-xs text-certified-muted">Credits never expire.</p>
      </Card>

      <div className="max-w-2xl rounded-card border border-dashed border-certified-border bg-certified-surface-2 p-6 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <p className="font-semibold text-certified-navy">What's coming later</p>
        <p className="mt-2 text-sm text-certified-muted">
          A Certified Premium tier is planned to unlock custom, self-uploaded certificate templates (still carrying
          the mandatory gold seal) for organizations that want a fully bespoke design. Other future additions —
          priority directory placement, advanced issuance analytics, a custom domain for your public page — remain
          undecided. Nothing above will move behind a paywall retroactively, and this page will be updated with real
          numbers if and when any of it ships.
        </p>
      </div>
    </Container>
  );
}
