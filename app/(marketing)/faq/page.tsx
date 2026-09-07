import type { Metadata } from 'next';
import { Container, PageHeader, SectionHeading } from '@/components/marketing/shared';
import { FaqAccordion } from '@/components/marketing/FaqAccordion';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Common questions from issuers, the public, and certified individuals.',
};

const ISSUER_FAQS = [
  {
    question: 'Who can apply to become an issuer?',
    answer:
      'Any training centre, business, or individual trainer. Businesses submit a registration document, e.g. CAC in Nigeria, or the local equivalent, individual trainers without one instead sign a declaration.',
  },
  {
    question: 'What if my application is rejected?',
    answer:
      'You can reapply immediately, there is no cooldown. Every prior attempt stays visible to reviewers, so fixing the actual issue gets you through fast without extra friction.',
  },
  {
    question: 'Can I change my certificate template later?',
    answer: 'Yes, from your brand settings. It only affects certificates issued after the change, already-issued certificates keep their original layout.',
  },
];

const PUBLIC_FAQS = [
  {
    question: 'Do I need an account to verify a certificate?',
    answer: 'No. Verification is public and unauthenticated, scan the QR code or enter the public ID directly.',
  },
  {
    question: 'How do I know a directory profile is real?',
    answer:
      'Every profile in the directory is backed by at least one certificate from an approved issuer, click through to any listed certificate to verify it independently.',
  },
  {
    question: 'Why can\'t I see someone\'s phone number or email directly?',
    answer:
      'Contact info is gated by default to prevent scraping. Use the contact button on their profile, your message and details go straight to them, but their raw contact info is never shown on the page.',
  },
];

const TRAINEE_FAQS = [
  {
    question: 'I was just certified, what do I do?',
    answer:
      'Check your email for a claim link from the issuer that certified you. Following it lets you sign in, or create an account, and take ownership of your profile.',
  },
  {
    question: 'Can I hide my profile from the directory?',
    answer:
      'Yes, at any time, from your profile editor, it\'s a reversible toggle. Hiding your directory listing never affects whether your certificate itself still verifies, those are independent.',
  },
  {
    question: 'Can I edit the certificate itself?',
    answer:
      'No, certificate content is fixed at issuance and can only be corrected by the issuer revoking and reissuing it. You can edit your own bio, photo, and contact preferences at any time.',
  },
];

export default function FaqPage() {
  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader eyebrow="FAQ" title="Common questions" />

      <div className="flex flex-col gap-6">
        <SectionHeading title="For issuers" />
        <FaqAccordion items={ISSUER_FAQS} />
      </div>
      <div className="flex flex-col gap-6">
        <SectionHeading title="For the public" />
        <FaqAccordion items={PUBLIC_FAQS} />
      </div>
      <div className="flex flex-col gap-6">
        <SectionHeading title="For certified individuals" />
        <FaqAccordion items={TRAINEE_FAQS} />
      </div>

      <p className="text-sm text-certified-muted">
        Didn't find your answer? <a className="underline" href="/contact">Contact us</a>.
      </p>
    </Container>
  );
}
