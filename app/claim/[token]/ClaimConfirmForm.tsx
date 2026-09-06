'use client';

import { useActionState } from 'react';
import { claimProfile, type ClaimState } from './actions';

export function ClaimConfirmForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ClaimState, FormData>(claimProfile.bind(null, token), null);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Claiming…' : 'Claim this profile'}
      </button>
    </form>
  );
}
