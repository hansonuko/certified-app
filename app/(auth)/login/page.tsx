'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Issuer/applicant login — deliberately separate from /staff/login
// (docs/roles-permissions.md §5), and this page never checks admin_users, so
// a staff credential signing in here still can't reach /dashboard (the
// dashboard layout's own guard, lib/auth/issuer.ts, sends any account with an
// admin_users row to /staff instead).
export default function LoginPage() {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/apply');
    router.refresh();
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/callback` },
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
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
        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-certified-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button
        onClick={handleGoogle}
        className="w-full max-w-sm rounded-control border border-certified-border px-4 py-2 text-certified-ink"
      >
        Continue with Google
      </button>
      <p className="text-sm text-certified-muted">
        No account? <Link href="/signup" className="text-certified-navy underline">Sign up</Link>
      </p>
      <p className="text-xs text-certified-muted">
        Staff member? <Link href="/staff/login" className="underline">Staff sign in</Link>
      </p>
    </main>
  );
}
