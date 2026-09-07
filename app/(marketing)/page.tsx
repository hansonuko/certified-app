import type { Metadata } from 'next';
import Link from 'next/link';
import { GoldSeal } from '@/components/GoldSeal';
import { Container, PrimaryLink, SecondaryLink, SectionHeading, Card } from '@/components/marketing/shared';
import { getPublicStats } from '@/lib/stats/public-stats';

export const metadata: Metadata = {
  title: 'Certified Africa — every certificate, verifiable in seconds',
  description:
    'Certified Africa issues branded, cryptographically verifiable training certificates on behalf of approved trainers and businesses, and runs a public directory of certified individuals across the continent.',
};

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'A trainer or business applies',
    body: 'Business/training-centre or individual trainers submit identification and proof of operation. A human reviewer approves before anything can be issued — nothing is auto-approved.',
  },
  {
    step: '02',
    title: 'Certificates get issued, branded and signed',
    body: 'Approved issuers add trainees and generate certificates from a fixed set of modern templates, each carrying the Certified gold seal and a server-signed, non-forgeable record.',
  },
  {
    step: '03',
    title: 'Anyone can verify it in seconds',
    body: 'A QR code or public ID resolves to a live verification page — status, issuer, trainee, and program, no login required. Revocations stay permanently disclosed, never hidden.',
  },
  {
    step: '04',
    title: 'Certified individuals get discovered',
    body: 'Trainees appear in a searchable public directory by skill and location, with gated contact so employers can reach out without their phone or email ever being scraped.',
  },
];

export default async function HomePage() {
  const stats = await getPublicStats();
  const showStats = stats.approvedIssuers > 0 || stats.certificatesIssued > 0;

  return (
    <>
      <section className="border-b border-certified-border bg-gradient-to-b from-certified-surface-2 to-certified-surface">
        <Container className="flex flex-col items-center gap-8 py-16 text-center sm:py-24">
          <div className="flex items-center gap-3 rounded-full border border-certified-border bg-certified-surface px-4 py-2 text-sm text-certified-muted">
            <GoldSeal size={20} idPrefix="hero-badge" />
            Pan-African trust infrastructure for training providers
          </div>

          <h1 className="max-w-3xl font-display text-4xl text-certified-navy sm:text-5xl">
            Every certificate, <span className="text-certified-gold">verifiable in seconds.</span>
          </h1>

          <p className="max-w-2xl text-lg text-certified-muted">
            Certified Africa issues branded certificates on behalf of approved trainers and businesses, gives every one a
            cryptographically verifiable public record, and turns certified trainees into a searchable, hireable directory.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <PrimaryLink href="/verify">Verify a certificate</PrimaryLink>
            <SecondaryLink href="/apply">Apply as a trainer or business</SecondaryLink>
          </div>

          {showStats ? (
            <dl className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
              <div>
                <dt className="text-sm text-certified-muted">Approved issuers</dt>
                <dd className="font-display text-3xl text-certified-navy">{stats.approvedIssuers}</dd>
              </div>
              <div>
                <dt className="text-sm text-certified-muted">Certificates issued</dt>
                <dd className="font-display text-3xl text-certified-navy">{stats.certificatesIssued}</dd>
              </div>
            </dl>
          ) : null}
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="How it works" title="From application to a verifiable public record" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <Card key={item.step}>
                <p className="font-display text-2xl text-certified-gold">{item.step}</p>
                <p className="mt-2 text-base font-semibold text-certified-navy">{item.title}</p>
                <p className="mt-2 text-sm text-certified-muted">{item.body}</p>
              </Card>
            ))}
          </div>
          <Link href="/how-it-works" className="text-sm font-medium text-certified-navy underline underline-offset-4 hover:text-certified-navy-2">
            Read the full walkthrough &rarr;
          </Link>
        </Container>
      </section>

      <section className="border-y border-certified-border bg-certified-navy py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-6 text-center">
          <GoldSeal size={64} idPrefix="cta-seal" />
          <h2 className="max-w-xl font-display text-2xl text-white sm:text-3xl">
            The gold seal means it came through Certified Africa
          </h2>
          <p className="max-w-xl text-white/70">
            Fixed on every certificate, regardless of issuer branding — a trust mark a viewer recognizes at a glance,
            backed by a signature that's re-checked on every verification.
          </p>
          <SecondaryLink href="/security">See how verification works</SecondaryLink>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-certified-gold">For trainers &amp; businesses</p>
            <h3 className="font-display text-xl text-certified-navy">Issue certificates your trainees can prove</h3>
            <p className="text-sm text-certified-muted">
              Apply once, get approved, then issue branded certificates — single-entry or bulk cohort upload — without
              touching a design tool.
            </p>
            <SecondaryLink href="/for-businesses">Learn more</SecondaryLink>
          </Card>
          <Card className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-certified-gold">For employers &amp; the public</p>
            <h3 className="font-display text-xl text-certified-navy">Find and verify certified people</h3>
            <p className="text-sm text-certified-muted">
              Search the directory by skill and location, verify any certificate instantly, and reach out through a
              contact-gated message — no scraped phone numbers, ever.
            </p>
            <SecondaryLink href="/for-individuals">Learn more</SecondaryLink>
          </Card>
        </Container>
      </section>
    </>
  );
}
