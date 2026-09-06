'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Staff password reset, step 1 of 2 (step 2 is ./reset-password). Standard
// Supabase Auth flow: resetPasswordForEmail sends a one-time recovery link;
// Supabase deliberately doesn't reveal whether the address has an account,
// so this always shows the same "check your email" confirmation regardless
// of the actual result — matching that same account-enumeration protection
// on our side rather than undoing it with a different error for "no such
// account."
export default function StaffForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/staff/login/reset-password`,
    });
    if (error) console.error('resetPasswordForEmail failed:', error.message);
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-certified-navy p-8 text-center">
        <h1 className="font-display text-2xl text-white">Check your email</h1>
        <p className="max-w-sm text-certified-border">
          If {email} has a staff account, we've sent a link to reset the password.
        </p>
        <Link href="/staff/login" className="text-sm text-white underline">
          Back to staff sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-certified-navy p-8">
      <h1 className="font-display text-2xl text-white">Reset your password</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-white">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2 text-certified-ink"
          />
        </label>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-control bg-certified-gold px-4 py-2 text-certified-ink disabled:opacity-50"
        >
          {status === 'submitting' ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <Link href="/staff/login" className="text-sm text-white underline">
        Back to staff sign in
      </Link>
    </main>
  );
}
