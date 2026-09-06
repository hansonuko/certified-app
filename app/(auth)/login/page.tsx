import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

// `LoginForm` reads `?next=` via useSearchParams(), which needs a Suspense
// boundary to be statically prerenderable (same split as
// app/staff/login/verify-mfa/page.tsx + VerifyMfaForm.tsx).
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
