'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/PasswordField';

// Basic issuer/applicant sign-up (docs/build-phases.md Phase 0). The full
// "choose Business/Training Centre or Individual Trainer" application intake
// is Phase 1 — this page only wires up the auth account itself, tagged
// user_type: 'applicant' in auth metadata.
//
// user_metadata is client-editable by design (Supabase lets a user call
// updateUser({ data })), so it's a UX hint only, never a security boundary —
// the real applicant/issuer vs. staff separation is that an applicant's uid
// simply has no row in admin_users (see lib/auth/issuer.ts, lib/auth/staff.ts).
export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'check-email'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { user_type: 'applicant', full_name: fullName },
        emailRedirectTo: `${window.location.origin}/apply`,
      },
    });
    if (error) {
      setError(error.message);
      setStatus('idle');
      return;
    }
    setStatus('check-email');
  }

  if (status === 'check-email') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-2xl text-certified-navy">Check your email</h1>
        <p className="max-w-sm text-certified-muted">
          We sent a confirmation link to {email}. Confirm your address to finish creating your account.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Create your account</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Full name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
        <PasswordField label="Password" value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
        {error ? <p className="text-sm text-certified-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
        >
          {status === 'submitting' ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-certified-muted">
        Already have an account? <Link href="/login" className="text-certified-navy underline">Sign in</Link>
      </p>
    </main>
  );
}
