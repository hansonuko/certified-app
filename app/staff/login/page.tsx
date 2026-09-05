'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Separate staff auth surface (docs/roles-permissions.md §5) — email/password
// only, no Google, so it's easier to apply stricter rate-limiting to this
// path specifically once Upstash is wired up (Phase 2.75). After password
// sign-in, route to whichever MFA step applies; the real enforcement lives
// in lib/auth/staff.ts's requireStaffSession(), called from
// app/staff/layout.tsx — this page is just the on-ramp.
export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = factors?.totp?.find((f) => f.status === 'verified');

    setLoading(false);

    // MFA is mandatory for every staff role, not optional (docs/roles-
    // permissions.md §5) — an account with no verified factor yet is sent to
    // enroll, not waved through.
    if (!verifiedTotp) {
      router.push('/staff/login/enroll-mfa');
      return;
    }

    router.push(`/staff/login/verify-mfa?factorId=${verifiedTotp.id}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-certified-navy p-8">
      <h1 className="font-display text-2xl text-white">Staff sign in</h1>
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
        <label className="flex flex-col gap-1 text-sm text-white">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2 text-certified-ink"
          />
        </label>
        {error ? <p className="text-sm text-certified-gold-light">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-control bg-certified-gold px-4 py-2 text-certified-ink disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Continue'}
        </button>
      </form>
    </main>
  );
}
