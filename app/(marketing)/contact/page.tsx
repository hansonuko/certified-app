import type { Metadata } from 'next';
import { Container, PageHeader } from '@/components/marketing/shared';
import { PlatformContactForm } from '@/components/marketing/PlatformContactForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Certified Africa.',
};

export default function ContactPage() {
  return (
    <Container className="flex flex-col gap-10 py-16 sm:py-20">
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        subtitle="For issuer support, press, or anything else, this isn't for contacting a specific trainee or organization listed in the directory, use the contact button on their own profile for that."
      />
      <div className="max-w-xl">
        <PlatformContactForm />
      </div>
    </Container>
  );
}
