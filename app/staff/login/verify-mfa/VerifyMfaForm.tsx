'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function VerifyMfaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const factorId = searchParams.get('factorId');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) {
      setError('Missing MFA factor — sign in again.');
      return;
    }
    setError(null);
    setVerifying(true);
    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setVerifying(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    setVerifying(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    router.push('/staff');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        required
        autoFocus
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="rounded-control border border-certified-border px-3 py-2 text-center text-lg tracking-widest text-certified-ink"
      />
      {error ? <p className="text-sm text-certified-gold-light">{error}</p> : null}
      <button
        type="submit"
        disabled={verifying}
        className="rounded-control bg-certified-gold px-4 py-2 text-certified-ink disabled:opacity-50"
      >
        {verifying ? 'Verifying…' : 'Verify'}
      </button>
    </form>
  );
}
