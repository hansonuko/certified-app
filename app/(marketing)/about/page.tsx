import type { Metadata } from 'next';
import { GoldSeal } from '@/components/GoldSeal';
import { Container, PageHeader, SectionHeading } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'About',
  description: 'Certified Africa is a trust infrastructure layer for training providers, built by Sun Media Limited.',
};

export default function AboutPage() {
  return (
    <Container className="flex flex-col gap-12 py-16 sm:py-20">
      <PageHeader eyebrow="About" title="Trust infrastructure for training, built for Africa" />

      <div className="flex max-w-2xl flex-col gap-4 text-certified-muted">
        <p>
          Certified Africa exists because a training certificate is only as good as someone's ability to check it.
          Most credentials in circulation today are a static PDF or a printed page — easy to photocopy, easy to
          falsify, and impossible for an employer or the public to independently confirm.
        </p>
        <p>
          We built a different model: approved trainers and businesses issue certificates through us, every one gets
          a cryptographically signed record and a public verification page, and certified individuals get a
          searchable, hireable directory profile they control. Nothing is issued until an applicant is reviewed and
          approved by a person — the "Certified" mark is only worth something because it isn't automatic.
        </p>
        <p>
          Certified Africa is a product of <strong className="text-certified-ink">Sun Media Limited</strong>, and
          operates across the African continent rather than any single country.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Product pillars" title="What we actually do" />
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Pillar title="Issuer trust layer">
            Businesses and trainers apply and are approved before they can issue anything.
          </Pillar>
          <Pillar title="Certificate design & generation">
            We design the certificate — brand-consistent, reusable per issuer — so issuers never touch design tools.
          </Pillar>
          <Pillar title="Verification">
            Any certificate, or any certified individual, can be looked up and cryptographically confirmed authentic.
          </Pillar>
          <Pillar title="Public directory & hire layer">
            The public discovers certified people by skill and location, and can contact them directly.
          </Pillar>
        </ul>
      </div>

      <div className="flex items-center gap-4 rounded-card border border-certified-border bg-certified-surface-2 p-6">
        <GoldSeal size={48} idPrefix="about-seal" />
        <p className="text-sm text-certified-muted">
          The gold seal is our own trust mark — fixed, non-configurable, and identical on every certificate we issue,
          regardless of which business or trainer is behind it.
        </p>
      </div>
    </Container>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-card border border-certified-border bg-certified-surface p-5">
      <p className="font-semibold text-certified-navy">{title}</p>
      <p className="mt-1 text-sm text-certified-muted">{children}</p>
    </li>
  );
}
