import type { Metadata } from 'next';
import { Container, PageHeader } from '@/components/marketing/shared';
import { LegalSection, LegalDraftNotice } from '@/components/marketing/Legal';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing use of Certified Africa, for issuers, trainees, and visitors alike.',
};

const LAST_UPDATED = 'September 2026';

export default function TermsPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <PageHeader eyebrow="Legal" title="Terms of Service" subtitle={`Last updated: ${LAST_UPDATED}`} />
      <LegalDraftNotice />

      <div className="flex max-w-3xl flex-col gap-10">
        <LegalSection title="1. What Certified Africa is">
          <p>
            Certified Africa (operated by Sun Media Limited) is a platform that reviews and approves training
            providers ("issuers"), lets approved issuers generate branded, cryptographically signed certificates for
            people they train ("trainees"), and runs a public directory and verification service for those
            certificates. Using the platform in any capacity means you agree to these terms.
          </p>
        </LegalSection>

        <LegalSection title="2. Issuer accounts">
          <ul className="list-disc pl-5">
            <li>You must be approved before you can issue any certificate, applying does not guarantee approval.</li>
            <li>
              Information you submit (identification, proof of operation, address, contact details) must be
              accurate. Submitting false or misleading information is grounds for rejection, suspension, or
              revocation of already-issued certificates.
            </li>
            <li>
              You're responsible for confirming a trainee's consent before creating their public profile, this is a
              requirement of using the issuance flow, not an optional step.
            </li>
            <li>
              Certificate content cannot be edited after issuance. If you made an error, revoke the certificate with
              a reason and reissue a corrected one, the correction stays visible in the certificate's history.
            </li>
            <li>
              We may suspend an issuer account or freeze issuance if we detect fraud, abuse, or unusual
              issuance-volume patterns pending review.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Trainee profiles">
          <ul className="list-disc pl-5">
            <li>
              A trainee profile is created by the issuer that certified you, with your consent confirmed by them at
              that time.
            </li>
            <li>
              You can claim your profile via the emailed claim link and then edit your own bio, photo, and contact
              preferences, or hide your directory listing, at any time, reversibly.
            </li>
            <li>
              Hiding your directory listing does not delete or invalidate the underlying certificate, it remains
              independently verifiable, since that's what gives it evidentiary value.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5">
            <li>Attempt to enumerate, scrape, or bulk-download certificate records or directory contact information.</li>
            <li>Submit false identification, forged documents, or impersonate another person or organization.</li>
            <li>Use the contact-relay feature to send spam, harassment, or unsolicited commercial messages.</li>
            <li>Attempt to circumvent rate limiting, bot protection, or any other abuse-prevention measure.</li>
            <li>Reverse-engineer or attempt to forge the Certified gold seal, the signing mechanism, or a verification result.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Verification is provided as-is">
          <p>
            Certified Africa confirms whether a certificate record matches what we issued and signed, and whether its
            status is active, revoked, or expired. We do not independently audit the quality or content of the
            training an issuer provides, verification confirms the certificate is authentic and unaltered, not that
            you should trust the issuer's judgment for any particular purpose.
          </p>
        </LegalSection>

        <LegalSection title="6. Availability & changes">
          <p>
            We aim to keep the verification and directory services available, but don't guarantee uninterrupted
            uptime. We may update these terms, the platform's features, or (per our{' '}
            <a href="/pricing">pricing page</a>) introduce paid tiers in the future, material changes will be
            reflected here with an updated date, not applied retroactively to existing certificates.
          </p>
        </LegalSection>

        <LegalSection title="7. Contact">
          <p>
            Questions about these terms can be sent via our <a href="/contact">contact page</a>. See also our{' '}
            <a href="/privacy">Privacy Policy</a> for how we handle personal data.
          </p>
        </LegalSection>
      </div>
    </Container>
  );
}
