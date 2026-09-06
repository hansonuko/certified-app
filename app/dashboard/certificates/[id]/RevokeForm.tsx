'use client';

import { useActionState } from 'react';
import { revokeCertificate, type RevokeState } from './actions';

export function RevokeForm({ certificateId }: { certificateId: string }) {
  const [state, formAction, pending] = useActionState<RevokeState, FormData>(revokeCertificate.bind(null, certificateId), null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-certified-danger/30 bg-certified-danger/5 p-5">
      <h2 className="font-display text-lg text-certified-danger">Revoke this certificate</h2>
      <p className="text-sm text-certified-muted">
        Revocation is permanent and disclosed on the public verification page. Use this to correct a genuine error
        (wrong trainee, wrong program, issued in error) — not for a trainee-conduct dispute.
      </p>
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Reason (required)
        <textarea name="reason" rows={2} required className="rounded-control border border-certified-border px-3 py-2" />
      </label>
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-danger px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Revoking…' : 'Revoke certificate'}
      </button>
    </form>
  );
}
