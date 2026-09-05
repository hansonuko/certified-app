import { Suspense } from 'react';
import { VerifyMfaForm } from './VerifyMfaForm';

// TOTP challenge for a returning staff member who already has a verified
// factor (docs/roles-permissions.md §5) — this is what actually elevates the
// session from AAL1 to AAL2, which requireStaffSession() (lib/auth/staff.ts)
// checks for on every /staff/* page. useSearchParams() (for factorId) needs
// a Suspense boundary to be statically prerenderable, hence the split from
// VerifyMfaForm.
export default function VerifyMfaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-certified-navy p-8 text-white">
      <h1 className="font-display text-2xl">Enter your authentication code</h1>
      <Suspense>
        <VerifyMfaForm />
      </Suspense>
    </main>
  );
}
