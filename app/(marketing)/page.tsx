import type { Metadata } from 'next';
import Link from 'next/link';
import { GoldSeal } from '@/components/GoldSeal';
import { Container, PrimaryLink, SecondaryLink, SectionHeading, Card } from '@/components/marketing/shared';
import { getPublicStats } from '@/lib/stats/public-stats';

export const metadata: Metadata = {
  title: 'Certified Africa, every certificate verifiable in seconds',
  description:
    'Certified Africa issues branded, cryptographically verifiable training certificates on behalf of approved trainers and businesses, and runs a public directory of certified individuals across the continent.',
};

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'A trainer or business applies',
    body: 'Business, training centre, or individual trainers submit identification and proof of operation. A human reviewer approves before anything can be issued, nothing is auto-approved.',
  },
  {
    step: '02',
    title: 'Certificates get issued, branded and signed',
    body: 'Approved issuers add trainees and generate certificates from a fixed set of modern templates, each carrying the Certified gold seal and a server-signed, non-forgeable record.',
  },
  {
    step: '03',
    title: 'Anyone can verify it in seconds',
    body: 'A QR code or public ID resolves to a live verification page showing status, issuer, trainee, and program, no login required. Revocations stay permanently disclosed, never hidden.',
  },
  {
    step: '04',
    title: 'Certified individuals get discovered',
    body: 'Trainees appear in a searchable public directory by skill and location, with gated contact so employers can reach out without their phone or email ever being scraped.',
  },
];

const FOR_TRAINEES = [
  'A verifiable credential, not just a certificate you hope nobody questions',
  'A public profile employers across Africa can search, check, and trust',
  'A real shot at being found, shortlisted, and hired for what you can actually do',
];

const FOR_ISSUERS = [
  'Every trainee you certify gets continent wide visibility, not just a printed certificate',
  'A verified, badge-carrying reputation that sets your training apart from unverifiable competitors',
  'A public profile for your organization, discoverable by employers and prospective trainees alike',
];

export default async function HomePage() {
  const stats = await getPublicStats();
  const showStats = stats.approvedIssuers > 0 || stats.certificatesIssued > 0;

  return (
    <>
      <section className="border-b border-certified-border bg-gradient-to-b from-certified-surface-2 to-certified-surface dark:border-white/10 dark:bg-none">
        <Container className="flex flex-col items-center gap-8 py-16 text-center sm:py-24">
          <div className="flex items-center gap-3 rounded-full border border-certified-border bg-certified-surface px-4 py-2 text-sm text-certified-muted dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl">
            <GoldSeal size={20} idPrefix="hero-badge" />
            Pan-African trust infrastructure for training providers
          </div>

          <h1 className="max-w-3xl font-display text-4xl text-certified-navy sm:text-5xl">
            Every certificate, <span className="text-certified-gold">verifiable in seconds.</span>
          </h1>

          <p className="max-w-2xl text-lg text-certified-muted">
            Certified Africa issues branded certificates on behalf of approved trainers and businesses, gives every one a
            cryptographically verifiable public record, and turns certified trainees into a searchable, hireable directory
            seen across the whole continent.
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
          <SectionHeading
            eyebrow="Why it matters"
            title="Choose Certified. Get seen. Get hired."
            subtitle="A skill nobody can verify is a skill that stays invisible. Certified Africa is how training, on either side of it, actually gets recognized across the continent."
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="flex flex-col gap-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-certified-gold">If you are training or getting trained</p>
              <h3 className="font-display text-xl text-certified-navy">
                Choose a Certified Africa approved training provider
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-certified-ink">
                {FOR_TRAINEES.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1 text-certified-gold">&#9679;</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-certified-muted">
                Considering a training centre, vocational institute, or personal trainer that is not yet Certified
                Africa approved? Point them here. Once approved, your certificate stops being a piece of paper and
                becomes something an employer anywhere in Africa can actually check.
              </p>
              <SecondaryLink href="/directory">Browse certified talent</SecondaryLink>
            </Card>

            <Card className="flex flex-col gap-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-certified-gold">If you train, teach, or coach others</p>
              <h3 className="font-display text-xl text-certified-navy">
                Become a Certified Africa approved issuer
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-certified-ink">
                {FOR_ISSUERS.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1 text-certified-gold">&#9679;</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-certified-muted">
                Employers, vocational institutions, training centres, and independent trainers all qualify. Apply
                once, get approved, and every artisan, technician, or professional you certify gains a continent
                wide, verifiable presence, refined enough to be taken seriously and visible enough to be found.
              </p>
              <PrimaryLink href="/apply">Apply to become an issuer</PrimaryLink>
            </Card>
          </div>
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
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-certified-navy underline underline-offset-4 hover:text-certified-navy-2"
          >
            Read the full walkthrough &rarr;
          </Link>
        </Container>
      </section>

      <section className="relative overflow-hidden border-y border-certified-border bg-certified-navy py-16 dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-2xl sm:py-20">
        <Container className="relative flex flex-col items-center gap-6 text-center">
          <GoldSeal size={64} idPrefix="cta-seal" />
          <h2 className="max-w-xl font-display text-2xl text-white sm:text-3xl dark:text-certified-ink">
            The gold seal means it came through Certified Africa
          </h2>
          <p className="max-w-xl text-white/70 dark:text-certified-muted">
            Fixed on every certificate, regardless of issuer branding, a trust mark a viewer recognizes at a glance,
            backed by a signature that is re-checked on every verification.
          </p>
          <SecondaryLink href="/security">See how verification works</SecondaryLink>
        </Container>
      </section>

      {/* The "become an issuer" pitch used to be hardcoded here too, stacked
          right above the shared footer's own static version — the same
          heading appearing twice, and neither aware of whether the visitor
          had already applied. components/SiteFooter.tsx's ApplyStatusCallout
          is the single, auth/status-aware instance now; removed here rather
          than duplicated. */}
    </>
  );
}
