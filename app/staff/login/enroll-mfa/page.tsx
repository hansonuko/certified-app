'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Mandatory TOTP enrollment (docs/roles-permissions.md §5) — every staff
// role hits this the first time they sign in with no verified factor yet;
// there is no "skip for now" path, matching "MFA should be mandatory, not
// optional, for all three internal roles."
export default function EnrollMfaPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    });
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-certified-navy p-8 text-white">
      <h1 className="font-display text-2xl">Set up two-factor authentication</h1>
      <p className="max-w-sm text-center text-sm text-certified-border">
        Required for every staff account. Scan this with an authenticator app (e.g. Google
        Authenticator, 1Password), then enter the 6-digit code it shows.
      </p>
      {qrCode ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URI from Supabase, not a next/image candidate
        <img src={qrCode} alt="TOTP QR code" className="h-48 w-48 rounded-card bg-white p-2" />
      ) : null}
      {secret ? <p className="font-mono text-xs text-certified-border">Manual key: {secret}</p> : null}
      <form onSubmit={handleVerify} className="flex w-full max-w-xs flex-col gap-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          required
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-control border border-certified-border px-3 py-2 text-center text-lg tracking-widest text-certified-ink"
        />
        {error ? <p className="text-sm text-certified-gold-light">{error}</p> : null}
        <button
          type="submit"
          disabled={verifying || !factorId}
          className="rounded-control bg-certified-gold px-4 py-2 text-certified-ink disabled:opacity-50"
        >
          {verifying ? 'Verifying…' : 'Confirm & finish'}
        </button>
      </form>
    </main>
  );
}
