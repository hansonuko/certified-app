import type { Metadata } from 'next';
import { Container, PageHeader, PrimaryLink, SecondaryLink, SectionHeading, Card } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'How it works',
  description: 'How Certified Africa reviews issuers, generates certificates, and makes every one verifiable in seconds.',
};

export default function HowItWorksPage() {
  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader
        eyebrow="How it works"
        title="From application to a verifiable public record"
        subtitle="Three audiences use Certified Africa differently — issuers, the public, and certified individuals themselves. Here's the mechanics behind each."
      />

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="For issuers" title="Getting approved to issue" />
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Step n={1} title="Apply as a business or individual trainer">
            Submit your legal/registered name, an identification document, and — for businesses — proof of operation
            (e.g. a registration certificate). Individual trainers without a registered business instead sign a
            declaration of the training they deliver.
          </Step>
          <Step n={2} title="A human reviews your application">
            An Account Manager or Admin checks your documents before anything unlocks. Nothing is auto-approved.
            You'll hear back with a decision, or a request for more information if something's unclear.
          </Step>
          <Step n={3} title="Set up your brand once">
            Logo, primary color, signatory name and signature, and a template from ten modern designs. This is stored
            once and reused for every certificate you issue — consistent by design, not something you configure per
            certificate.
          </Step>
          <Step n={4} title="Issue certificates">
            Add trainees one at a time, or upload a CSV for a whole graduating cohort. Each one gets a certificate PDF,
            a unique verification record, and (with consent) a public directory profile — instantly.
          </Step>
        </ol>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="For the public" title="Verifying a certificate" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <p className="font-semibold text-certified-navy">Scan the QR code, or enter the ID</p>
            <p className="mt-2 text-sm text-certified-muted">
              Every certificate carries a QR code and a short public ID (e.g. <code>CERT-8F2K9-XQ41</code>) — random, not
              sequential, so IDs can't be guessed or scraped in order.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-certified-navy">The record, not the PDF, is authoritative</p>
            <p className="mt-2 text-sm text-certified-muted">
              A cryptographic signature computed over the certificate's core fields at issuance is re-checked on every
              lookup — a direct database edit without going through the signing service would invalidate it.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-certified-navy">Status is always current</p>
            <p className="mt-2 text-sm text-certified-muted">
              Valid, Revoked, or Expired (if the issuer set an expiry — common for safety recertification). A
              revocation stays permanently visible with its reason, never silently deleted.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-certified-navy">No account needed</p>
            <p className="mt-2 text-sm text-certified-muted">
              Verification is the trust product — it has to be frictionless, so it's public and unauthenticated by
              design (and rate-limited against abuse, see our <a className="underline" href="/security">security page</a>).
            </p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="For certified individuals" title="Your profile is yours" />
        <p className="max-w-2xl text-certified-muted">
          When you're issued a certificate, you get an email with a claim link. Claiming it lets you edit your bio,
          photo, and contact preferences, toggle "open to hire," or hide your directory profile entirely — the
          underlying certificate stays independently verifiable either way, since verification never depends on
          whether your profile is visible in the directory.
        </p>
      </div>

      <div className="flex flex-col items-start gap-4 rounded-card border border-certified-border bg-certified-surface-2 p-8">
        <p className="font-display text-xl text-certified-navy">Ready to get started?</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryLink href="/apply">Apply as a trainer or business</PrimaryLink>
          <SecondaryLink href="/directory">Browse the directory</SecondaryLink>
        </div>
      </div>
    </Container>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-card border border-certified-border bg-certified-surface p-5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-certified-navy text-sm font-semibold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-certified-navy">{title}</p>
        <p className="mt-1 text-sm text-certified-muted">{children}</p>
      </div>
    </div>
  );
}
