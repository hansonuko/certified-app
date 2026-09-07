import type { Metadata } from 'next';
import { Container, PageHeader } from '@/components/marketing/shared';
import { LegalSection, LegalDraftNotice } from '@/components/marketing/Legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Certified Africa collects, uses, and protects personal data — including trainee data specifically.',
};

const LAST_UPDATED = 'September 2026';

export default function PrivacyPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <PageHeader eyebrow="Legal" title="Privacy Policy" subtitle={`Last updated: ${LAST_UPDATED}`} />
      <LegalDraftNotice />

      <div className="flex max-w-3xl flex-col gap-10">
        <LegalSection title="1. Who this applies to">
          <p>
            This policy covers three kinds of people: <strong>applicants and issuers</strong> (businesses and
            individual trainers who apply to issue certificates), <strong>trainees</strong> (people certified by an
            issuer, whose profile may appear in the public directory), and <strong>visitors</strong> (anyone browsing
            or verifying a certificate without an account).
          </p>
        </LegalSection>

        <LegalSection title="2. What we collect">
          <ul className="list-disc pl-5">
            <li>
              <strong>From issuers:</strong> legal/registered name, business registration details where applicable,
              an identification document, proof of operation, address, and owner contact details, all submitted
              during application and review.
            </li>
            <li>
              <strong>From/about trainees:</strong> full name, an optional photo, bio, contact details (phone/email),
              country/region/locality, and the certificate(s) issued to them — entered by the issuer at
              certification time, with the issuer confirming the trainee's consent to a public profile.
            </li>
            <li>
              <strong>From visitors:</strong> only what's needed to operate the site — e.g. an IP address used
              transiently for rate-limiting the verification and contact endpoints against abuse.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Trainee data specifically">
          <p>
            A trainee's public profile is created by the issuer that certified them, and only with the issuer's
            confirmation that the trainee consented to it. Once created:
          </p>
          <ul className="list-disc pl-5">
            <li>
              The trainee receives an emailed claim link that lets them sign in and take ownership of the profile —
              editing their bio, photo, and contact preferences, or hiding the profile from the directory entirely.
            </li>
            <li>
              Phone and email are never shown directly on a public page to an unauthenticated visitor. Contact
              happens through a rate-limited relay: a visitor's message is forwarded to the trainee (or issuer) by
              email, with the sender's own contact info included so they can reply directly — Certified Africa does
              not continue as a party to that conversation.
            </li>
            <li>
              Hiding a directory profile is a self-service, reversible action and does not delete the underlying
              certificate record — verification of an already-issued certificate is independent of directory
              visibility, since that record is what makes the certificate legally meaningful.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Why we process this data">
          <p>
            To review and approve issuer applications; to generate, sign, and host verifiable certificate records; to
            operate the public directory and its contact-relay feature; to prevent abuse (rate limiting, fraud/spam
            detection); and to meet our own recordkeeping and legal obligations.
          </p>
        </LegalSection>

        <LegalSection title="5. How long we keep it">
          <p>
            Certificate records are kept indefinitely once issued — a certificate needs to remain verifiable for as
            long as someone might reasonably rely on it, including after a trainee hides their directory profile.
            Application documents and account data are kept for as long as the account is active, plus a reasonable
            period afterward for legal and audit purposes.
          </p>
        </LegalSection>

        <LegalSection title="6. Your rights">
          <p>
            Depending on the data-protection law that applies to you (for example Nigeria's NDPA 2023, or the
            equivalent law in your own country of operation), you may have rights to access, correct, or request
            deletion of your personal data, and to object to or restrict certain processing. A trainee can already
            exercise most of this directly through their claimed profile; for anything else, or if you don't have a
            claimed profile, <a className="underline" href="/contact">contact us</a>.
          </p>
        </LegalSection>

        <LegalSection title="7. Security">
          <p>
            Uploaded images are re-encoded server-side before storage rather than served back as the original file.
            Certificate signing happens server-side only, using a secret that is never exposed to any client or
            returned in an API response. See our <a className="underline" href="/security">Security &amp; trust</a>{' '}
            page for more detail on how certificate integrity itself is protected.
          </p>
        </LegalSection>

        <LegalSection title="8. Contact">
          <p>
            Questions about this policy, or a request relating to your data, can be sent via our{' '}
            <a className="underline" href="/contact">contact page</a>.
          </p>
        </LegalSection>
      </div>
    </Container>
  );
}
