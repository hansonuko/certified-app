'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PasswordField } from '@/components/PasswordField';

/**
 * Password + 2FA, client-side against Supabase Auth directly — same calls
 * app/staff/login/reset-password/page.tsx (password) and app/staff/login/
 * enroll-mfa/page.tsx (TOTP enrollment) already use, just reachable from
 * inside an already-authenticated session instead of a recovery-link or
 * forced-first-login flow. Unlike staff (docs/roles-permissions.md §5:
 * MFA mandatory), an issuer's MFA is recommended, not required — this
 * page lets them enroll or remove a factor freely, no forced redirect.
 */
export function SecuritySettings() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find((f) => f.status === 'verified');
      setFactorId(verified?.id ?? null);
    });
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message);
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setPasswordSaved(true);
  }

  async function startEnroll() {
    setMfaError(null);
    setEnrolling(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) {
      setMfaError(error.message);
      setEnrolling(false);
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setPendingFactorId(data.id);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFactorId) return;
    setMfaError(null);
    setMfaBusy(true);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeError) {
      setMfaError(challengeError.message);
      setMfaBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: pendingFactorId, challengeId: challenge.id, code });
    setMfaBusy(false);
    if (verifyError) {
      setMfaError(verifyError.message);
      return;
    }
    setFactorId(pendingFactorId);
    setEnrolling(false);
    setPendingFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode('');
  }

  async function handleRemove() {
    if (!factorId) return;
    setMfaError(null);
    setMfaBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setMfaBusy(false);
    if (error) {
      setMfaError(error.message);
      return;
    }
    setFactorId(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-sm flex-col gap-3 rounded-card border border-certified-border p-6">
        <h2 className="font-display text-lg text-certified-navy">Password</h2>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <PasswordField label="New password" value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={passwordSaving}
            className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {passwordSaving ? 'Saving…' : 'Update password'}
          </button>
          {passwordError ? <p className="text-sm text-certified-danger">{passwordError}</p> : null}
          {passwordSaved ? <p className="text-sm text-certified-success">Password updated.</p> : null}
        </form>
      </section>

      <section className="flex max-w-sm flex-col gap-3 rounded-card border border-certified-border p-6">
        <h2 className="font-display text-lg text-certified-navy">Two-factor authentication</h2>
        <p className="text-sm text-certified-muted">Recommended, not required, for issuer accounts.</p>

        {factorId ? (
          <>
            <p className="text-sm text-certified-success">Enabled.</p>
            <button
              type="button"
              onClick={handleRemove}
              disabled={mfaBusy}
              className="self-start rounded-control border border-certified-danger px-3 py-1.5 text-sm text-certified-danger disabled:opacity-50"
            >
              {mfaBusy ? 'Removing…' : 'Remove'}
            </button>
          </>
        ) : !enrolling ? (
          <button
            type="button"
            onClick={startEnroll}
            className="self-start rounded-control bg-certified-navy px-3 py-1.5 text-sm text-white"
          >
            Set up
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            {qrCode ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URI from Supabase
              <img src={qrCode} alt="TOTP QR code" className="h-40 w-40 rounded-card bg-white p-2" />
            ) : null}
            {secret ? <p className="font-mono text-xs text-certified-muted">Manual key: {secret}</p> : null}
            <form onSubmit={handleVerify} className="flex flex-col gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-control border border-certified-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={mfaBusy}
                className="self-start rounded-control bg-certified-navy px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {mfaBusy ? 'Verifying…' : 'Verify & enable'}
              </button>
            </form>
          </div>
        )}
        {mfaError ? <p className="text-sm text-certified-danger">{mfaError}</p> : null}
      </section>
    </div>
  );
}
