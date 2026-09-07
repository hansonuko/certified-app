import type { Metadata } from 'next';
import { GoldSeal } from '@/components/GoldSeal';
import { Container, PageHeader, SectionHeading, Card } from '@/components/marketing/shared';

export const metadata: Metadata = {
  title: 'Security & trust',
  description: 'How the Certified gold seal, signing, and revocation transparency actually work.',
};

export default function SecurityPage() {
  return (
    <Container className="flex flex-col gap-16 py-16 sm:py-20">
      <PageHeader
        eyebrow="Security & trust"
        title="What actually makes a certificate trustworthy"
        subtitle="Not the PDF, and not the seal alone, a combination of a human approval gate, server-side cryptographic signing, and a live record that a QR code always points back to."
      />

      <div className="flex flex-col items-center gap-4 rounded-card border border-certified-border bg-certified-surface-2 p-8 text-center dark:border-white/10 dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <GoldSeal size={80} idPrefix="security-page-seal" />
        <p className="max-w-xl font-display text-xl text-certified-navy">The gold seal</p>
        <p className="max-w-xl text-sm text-certified-muted">
          Every certificate carries this exact mark, in this exact gold, never recolored to an issuer's brand, never
          resized below legibility, never issuer-configurable. Because it's identical everywhere, a missing or
          poorly-reproduced seal is itself a red flag, on top of the cryptographic check underneath it.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="How verification works" title="The record is authoritative, not the file" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <p className="font-semibold text-certified-navy">Non-sequential public IDs</p>
            <p className="mt-2 text-sm text-certified-muted">
              Every certificate gets a random public ID, e.g. <code>CERT-8F2K9-XQ41</code>, never an incrementing
              number, so IDs can't be enumerated or scraped in order, and there's no endpoint that lists them all.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-certified-navy">Server-side cryptographic signing</p>
            <p className="mt-2 text-sm text-certified-muted">
              A signature is computed over the certificate's core fields at issuance, using a secret that never
              leaves the server and is never returned in any API response. Every verification re-checks it, a direct
              database edit that bypasses the signing service breaks the signature.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-certified-navy">Rate-limited lookups</p>
            <p className="mt-2 text-sm text-certified-muted">
              The verification endpoint is public by design, it has to be frictionless, but it's rate-limited per IP,
              with no bulk-listing capability anywhere in the system.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-certified-navy">Revocation is disclosed, not hidden</p>
            <p className="mt-2 text-sm text-certified-muted">
              A revoked certificate stays permanently visible as revoked, with its reason and date, deleting the
              record instead would undermine the whole point of the system.
            </p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Issuer trust" title="Nothing gets issued without a human review" />
        <p className="max-w-2xl text-certified-muted">
          Every organization on Certified Africa applied and was reviewed, identification and, for businesses, proof
          of operation are checked before any issuance capability unlocks. Unusual issuance volume spikes are
          surfaced to our staff for review, and two-factor authentication is required internally and available to
          issuers.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="Your data" title="Consent first, gated by default" />
        <p className="max-w-2xl text-certified-muted">
          A trainee's public profile requires the issuer to confirm consent at the time it's created. Trainees get an
          emailed claim link to edit, hide, or manage their own profile at any time. Phone and email are never
          rendered directly on a public page for anyone unauthenticated, contact happens through a rate-limited
          relay instead. See our <a className="underline" href="/privacy">Privacy Policy</a> for the full picture.
        </p>
      </div>
    </Container>
  );
}
