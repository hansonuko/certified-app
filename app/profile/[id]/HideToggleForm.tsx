'use client';

import { useActionState } from 'react';
import { setHidden, type HideState } from './actions';

export function HideToggleForm({ id, isHidden }: { id: string; isHidden: boolean }) {
  const [state, formAction, pending] = useActionState<HideState, FormData>(setHidden.bind(null, id, !isHidden), null);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-card border border-certified-border p-4">
      <p className="text-sm text-certified-muted">
        {isHidden
          ? 'Your profile is currently hidden from the public directory. Your certificate itself stays independently verifiable either way.'
          : 'Your profile is visible in the public directory.'}
      </p>
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control border border-certified-border px-4 py-2 text-sm text-certified-ink disabled:opacity-50"
      >
        {pending ? 'Saving…' : isHidden ? 'Unhide my profile' : 'Hide my profile from the directory'}
      </button>
    </form>
  );
}
