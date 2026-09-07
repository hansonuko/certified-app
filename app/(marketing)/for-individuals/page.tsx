import type { Metadata } from 'next';
import { Container, PageHeader, PrimaryLink, SecondaryLink, SectionHeading, Card } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'For employers & the public',
  description: 'Search certified individuals by skill and location, verify their credentials, and reach out safely.',
};

const WHY_CHOOSE_CERTIFIED = [
  'Every listed credential traces back to a real, approved training provider, not a claim you have to take on faith',
  'You can verify any certificate yourself in seconds, before you ever pick up the phone',
  'Search reaches across the whole continent, so you are choosing from real talent, not just whoever is nearby',
];

export default function ForIndividualsPage() {
  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader
        eyebrow="For employers & the public"
        title="Find certified people you can actually verify"
        subtitle="Every profile in the directory is backed by a certificate from an approved issuer, searchable by skill, location, and availability, and checkable by anyone in seconds."
      />

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Why this matters" title="Hire the skill, not the story" />
        <p className="max-w-2xl text-certified-muted">
          Anyone can claim to be trained. Certified Africa is built so you do not have to take that claim on faith,
          every artisan, technician, or professional in the directory was certified by a business, institution, or
          trainer that applied and was approved first. That is what makes their portfolio worth trusting, and worth
          hiring.
        </p>
        <ul className="flex flex-col gap-3 text-sm text-certified-ink">
          {WHY_CHOOSE_CERTIFIED.map((point) => (
            <li key={point} className="flex gap-2">
              <span aria-hidden="true" className="mt-1 text-certified-gold">&#9679;</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="font-semibold text-certified-navy">Search by skill & location</p>
          <p className="mt-2 text-sm text-certified-muted">
            Filter the directory by field of training, country or region, issuing organization, completion date, and
            whether someone is currently open to hire.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Every credential is verifiable</p>
          <p className="mt-2 text-sm text-certified-muted">
            A profile shows the actual certificate behind it, issuer, program, and completion date, each one
            checkable independently on the verification page.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Contact without exposed numbers</p>
          <p className="mt-2 text-sm text-certified-muted">
            Reach out through a message relay, your note and contact info go straight to them, but their raw phone
            or email is never rendered on the page for scraping.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Hiring at scale" title="For employers reviewing several candidates" />
        <p className="max-w-2xl text-certified-muted">
          Cross-check any certificate you are handed against its public ID or QR code before you rely on it, that is
          the whole point of the verification page, a live record, not a static document, that cannot be forged or
          quietly altered.
        </p>
      </div>

      <div className="flex flex-col gap-6 rounded-card border border-dashed border-certified-gold/40 bg-certified-surface-2 p-8 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <SectionHeading
          eyebrow="Can't find who you need"
          title="Point their trainer toward Certified Africa"
        />
        <p className="max-w-2xl text-certified-muted">
          If the artisan, technician, or professional you want to hire trained somewhere that is not yet Certified
          Africa approved, encourage that training centre, institution, or personal trainer to apply. Once approved,
          their trainees, including the one you are looking at right now, become searchable, verifiable, and
          hireable across the whole continent.
        </p>
        <SecondaryLink href="/for-businesses">Share the issuer page</SecondaryLink>
      </div>

      <div className="flex flex-col items-start gap-4 rounded-card border border-certified-border bg-certified-surface-2 p-8 dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <p className="font-display text-xl text-certified-navy">Start looking</p>
        <PrimaryLink href="/directory">Browse the directory</PrimaryLink>
      </div>
    </Container>
  );
}
