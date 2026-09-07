import type { Metadata } from 'next';
import { Container, PageHeader, PrimaryLink, SectionHeading, Card } from '@/components/marketing/shared';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';

export const metadata: Metadata = {
  title: 'For training centres & trainers',
  description: 'Issue branded, verifiable certificates for your trainees without touching a design tool.',
};

const FAQS = [
  {
    question: 'Do I need a registered business to apply?',
    answer:
      'No. Individual trainers without a registered business can apply too — you sign a declaration of the training you deliver instead of submitting a business registration certificate. An identification document is required either way.',
  },
  {
    question: 'How long does approval take?',
    answer:
      'It depends on reviewer volume, but there is no auto-approval — every application gets a human review before any issuance capability unlocks. If something is unclear, you will be asked for more information rather than rejected outright.',
  },
  {
    question: 'Can I use my own certificate design?',
    answer:
      'Not in v1 — you choose from ten Certified Africa-designed templates, each carrying your logo, brand color, and signature. This keeps output consistent and prevents brand impersonation risk; custom-upload templates are on the roadmap.',
  },
  {
    question: 'What happens if I need to correct a certificate?',
    answer:
      "Certificate content can't be edited after issuance — only revoked, with a reason, and reissued if needed. The correction trail is preserved, and revocations stay permanently visible on the verification page.",
  },
  {
    question: 'Can I issue a whole graduating class at once?',
    answer:
      'Yes — upload a CSV for a cohort under one training program. It gets validated (required fields, duplicate detection) with a preview before anything commits, then batch-generates certificates and directory profiles.',
  },
];

export default function ForBusinessesPage() {
  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader
        eyebrow="For training centres & trainers"
        title="Give every certificate you issue a verifiable public record"
        subtitle="Certified Africa designs the certificate, signs the record, and hosts the verification page — you focus on training."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="font-semibold text-certified-navy">Nothing to design</p>
          <p className="mt-2 text-sm text-certified-muted">
            Pick from ten modern templates, set your logo, color, and signature once — every certificate you issue
            reuses it automatically.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Single or bulk issuance</p>
          <p className="mt-2 text-sm text-certified-muted">
            Add one trainee at a time, or upload a CSV for a whole cohort with validation and a preview before it
            commits.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">A public profile for your organization</p>
          <p className="mt-2 text-sm text-certified-muted">
            Your training programs and certified roster are discoverable in the directory, with a contact-gated
            inquiry button.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Fraud-resistant by construction</p>
          <p className="mt-2 text-sm text-certified-muted">
            Every certificate is cryptographically signed server-side and carries the fixed Certified gold seal — a
            certificate that didn't come through us is an immediate visual and technical red flag.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Revocation when you need it</p>
          <p className="mt-2 text-sm text-certified-muted">
            Made an error, or need to withdraw a certification? Revoke with a reason — disclosed permanently, not
            silently deleted, which is what keeps the system trustworthy.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Free during launch</p>
          <p className="mt-2 text-sm text-certified-muted">
            There's no paid plan yet — see <a className="underline" href="/pricing">pricing</a> for what that looks like
            going forward.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Questions" title="Issuer FAQ" />
        <FaqAccordion items={FAQS} />
      </div>

      <div className="flex flex-col items-start gap-4 rounded-card border border-certified-border bg-certified-surface-2 p-8">
        <p className="font-display text-xl text-certified-navy">Ready to apply?</p>
        <PrimaryLink href="/apply">Apply as a trainer or business</PrimaryLink>
      </div>
    </Container>
  );
}
