import { VerifyLookupForm } from './VerifyLookupForm';

// /verify (docs/sitemap.md) — manual entry point when there's no QR code to
// scan (e.g. someone reading a printed certificate over the phone). The real
// trust moment is /verify/[public_id] (docs/design-system.md §2).
export default function VerifyLookupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-3xl text-certified-navy">Verify a certificate</h1>
      <p className="text-certified-muted">
        Enter the certificate ID printed below its QR code, or scan the QR code directly.
      </p>
      <VerifyLookupForm />
    </main>
  );
}
