import type { Metadata } from 'next';
import { Container, PageHeader, PrimaryLink, SectionHeading, Card } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'For employers & the public',
  description: 'Search certified individuals by skill and location, verify their credentials, and reach out safely.',
};

export default function ForIndividualsPage() {
  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader
        eyebrow="For employers & the public"
        title="Find certified people you can actually verify"
        subtitle="Every profile in the directory is backed by a certificate from an approved issuer — searchable by skill, location, and availability."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="font-semibold text-certified-navy">Search by skill & location</p>
          <p className="mt-2 text-sm text-certified-muted">
            Filter the directory by field of training, country/region, issuing organization, completion date, and
            whether someone is currently open to hire.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Every credential is verifiable</p>
          <p className="mt-2 text-sm text-certified-muted">
            A profile shows the actual certificate(s) behind it — issuer, program, and completion date — each one
            checkable independently on the verification page.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Contact without exposed numbers</p>
          <p className="mt-2 text-sm text-certified-muted">
            Reach out through a message relay — your note and contact info go straight to them, but their raw phone or
            email is never rendered on the page for scraping.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Hiring at scale" title="For employers reviewing several candidates" />
        <p className="max-w-2xl text-certified-muted">
          Cross-check any certificate you're handed against its public ID or QR code before you rely on it — that's
          the whole point of the verification page: a live record, not a static document, that can't be forged or
          quietly altered.
        </p>
      </div>

      <div className="flex flex-col items-start gap-4 rounded-card border border-certified-border bg-certified-surface-2 p-8">
        <p className="font-display text-xl text-certified-navy">Start looking</p>
        <PrimaryLink href="/directory">Browse the directory</PrimaryLink>
      </div>
    </Container>
  );
}
