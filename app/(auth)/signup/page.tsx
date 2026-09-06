import { Suspense } from 'react';
import { SignupForm } from './SignupForm';

// `SignupForm` reads `?next=` via useSearchParams(), which needs a Suspense
// boundary to be statically prerenderable (same split as
// app/staff/login/verify-mfa/page.tsx + VerifyMfaForm.tsx).
export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
