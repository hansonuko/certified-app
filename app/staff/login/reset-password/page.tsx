'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/PasswordField';

// Staff password reset, step 2 of 2 (started from ../forgot-password).
// Supabase's client-side SDK auto-detects the recovery token in this page's
// URL (the link from the reset email) and fires a PASSWORD_RECOVERY auth
// event once it establishes the temporary session that authorizes
// updateUser({ password }) below — this page never handles the token
// itself. MFA/2FA is unaffected by a password reset (docs/roles-
// permissions.md §5): the next real sign-in at /staff/login still goes
// through the normal MFA challenge with the account's existing factor.
export default function StaffResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'submitting' | 'done'>('waiting');

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('ready');
    });

    // In case the event already fired before this component subscribed.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setStatus((s) => (s === 'waiting' ? 'ready' : s));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStatus('submitting');
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setStatus('ready');
      return;
    }
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-certified-navy p-8 text-center">
        <h1 className="font-display text-2xl text-white">Password updated</h1>
        <Link href="/staff/login" className="rounded-control bg-certified-gold px-4 py-2 text-certified-ink">
          Sign in
        </Link>
      </main>
    );
  }

  if (status === 'waiting') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-certified-navy p-8 text-center">
        <h1 className="font-display text-2xl text-white">Checking your reset link…</h1>
        <p className="max-w-sm text-certified-border">
          If this takes more than a few seconds, the link may be invalid or expired.
        </p>
        <Link href="/staff/login/forgot-password" className="text-sm text-white underline">
          Request a new link
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-certified-navy p-8">
      <h1 className="font-display text-2xl text-white">Set a new password</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <PasswordField label="New password" value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" dark />
        <PasswordField label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} required minLength={8} autoComplete="new-password" dark />
        {error ? <p className="text-sm text-certified-gold-light">{error}</p> : null}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-control bg-certified-gold px-4 py-2 text-certified-ink disabled:opacity-50"
        >
          {status === 'submitting' ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </main>
  );
}
