import type { Metadata } from 'next';
import { Container, PageHeader, SectionHeading, Card } from '@/components/marketing/shared';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';
import { getApplyStatus } from '@/lib/auth/apply-status';

export const metadata: Metadata = {
  title: 'For training centres & trainers',
  description: 'Become Certified Africa approved and give every trainee you certify continent wide visibility.',
};

const FAQS = [
  {
    question: 'Do I need a registered business to apply?',
    answer:
      'No. Individual trainers without a registered business can apply too, you sign a declaration of the training you deliver instead of submitting a business registration certificate. An identification document is required either way.',
  },
  {
    question: 'How long does approval take?',
    answer:
      'It depends on reviewer volume, but there is no auto-approval, every application gets a human review before any issuance capability unlocks. If something is unclear, you will be asked for more information rather than rejected outright.',
  },
  {
    question: 'Can I use my own certificate design?',
    answer:
      'Not in v1, you choose from ten Certified Africa designed templates, each carrying your logo, brand color, and signature. This keeps output consistent and prevents brand impersonation risk. Custom-upload templates are on the roadmap.',
  },
  {
    question: 'What happens if I need to correct a certificate?',
    answer:
      "Certificate content can't be edited after issuance, only revoked, with a reason, and reissued if needed. The correction trail is preserved, and revocations stay permanently visible on the verification page.",
  },
  {
    question: 'Can I issue a whole graduating class at once?',
    answer:
      'Yes, upload a CSV for a cohort under one training program. It gets validated, required fields, duplicate detection, with a preview before anything commits, then batch-generates certificates and directory profiles.',
  },
];

export default async function ForBusinessesPage() {
  // The default subtitle presupposes the reader hasn't applied yet — same
  // lib/auth/apply-status.ts check as everywhere else this page's "you're
  // not yet approved" framing shouldn't be shown to someone who already
  // has applied (or is already approved).
  const applyStatus = await getApplyStatus();
  const hasNotApplied = applyStatus.state === 'anonymous' || applyStatus.state === 'no-org';
  const subtitle = hasNotApplied
    ? 'If your training outfit is not yet Certified Africa approved, this is the page that changes that. Apply, get approved, and every artisan or professional you train gets a shot at continent wide visibility.'
    : "Here's what being a Certified Africa approved issuer gets your organization, from issuance to the public directory.";

  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader
        eyebrow="For training centres, institutions & trainers"
        title="Your trainees deserve to be seen, verified, and hired, not just handed a certificate"
        subtitle={subtitle}
      />

      <div className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Why it matters"
          title="An unverifiable certificate is an invisible trainee"
        />
        <p className="max-w-2xl text-certified-muted">
          Employers across Africa are looking for real, checked skills, not certificates they cannot confirm. When
          you become a Certified Africa approved issuer, every person you train stops being a name on a printed
          document and becomes a verified, searchable profile that employers, agencies, and clients can find and
          trust, wherever they are on the continent. That is the difference between training someone and actually
          giving them a real chance at being hired for it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="font-semibold text-certified-navy">Nothing to design</p>
          <p className="mt-2 text-sm text-certified-muted">
            Pick from ten modern templates, set your logo, color, and signature once, every certificate you issue
            reuses it automatically.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Single or bulk issuance</p>
          <p className="mt-2 text-sm text-certified-muted">
            Add one trainee at a time, or upload a CSV for a whole cohort, with validation and a preview before it
            commits.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Continent wide visibility for your trainees</p>
          <p className="mt-2 text-sm text-certified-muted">
            Your training programs and certified roster are discoverable in a directory reaching across Africa, with
            a contact-gated inquiry button so employers can reach out directly.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Fraud-resistant by construction</p>
          <p className="mt-2 text-sm text-certified-muted">
            Every certificate is cryptographically signed server-side and carries the fixed Certified gold seal, a
            certificate that did not come through us is an immediate visual and technical red flag.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Revocation when you need it</p>
          <p className="mt-2 text-sm text-certified-muted">
            Made an error, or need to withdraw a certification? Revoke with a reason, disclosed permanently, not
            silently deleted, which is what keeps the system trustworthy.
          </p>
        </Card>
        <Card>
          <p className="font-semibold text-certified-navy">Free during launch</p>
          <p className="mt-2 text-sm text-certified-muted">
            There is no paid plan yet, see <a className="underline" href="/pricing">pricing</a> for what that looks
            like going forward.
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-6 rounded-card border border-dashed border-certified-gold/40 bg-certified-surface-2 p-8 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <SectionHeading
          eyebrow="Who should apply"
          title="Employers, vocational institutions, training centres, and personal trainers, all welcome"
        />
        <p className="max-w-2xl text-certified-muted">
          Whether you run a large vocational institution, a small skills academy, an in-house corporate training
          arm, or you personally coach apprentices one on one, becoming a Certified Africa member gives your
          trainees the same thing, a verifiable, refined, continent spanning profile that helps them get seen,
          checked, and hired anywhere in Africa. If your training outfit is not on Certified Africa yet, that is the
          gap keeping your trainees invisible to employers who would otherwise find them.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Questions" title="Issuer FAQ" />
        <FaqAccordion items={FAQS} />
      </div>

      {/* "Ready to apply?" used to be a static card here, shown identically
          to every visitor including one who'd already applied or was
          already approved. Removed in favor of the shared footer's own
          auth/status-aware callout (components/SiteFooter.tsx) rather than
          duplicated — this page's own hardcoded pitch also stacked oddly
          close to that footer band. */}
    </Container>
  );
}
