'use client';

import { useActionState } from 'react';
import { adjustWallet, type AdjustWalletState } from '../actions';

export function AdjustWalletForm({ orgId }: { orgId: string }) {
  const [state, formAction, pending] = useActionState<AdjustWalletState, FormData>(adjustWallet, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-certified-border p-4">
      <input type="hidden" name="org_id" value={orgId} />
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Quantity (positive to credit, negative to debit)
        <input name="quantity" type="number" step={1} required className="w-40 rounded-control border border-certified-border px-3 py-2" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Reason (required — this is audit-logged)
        <textarea name="note" rows={2} required minLength={5} className="rounded-control border border-certified-border px-3 py-2" />
      </label>
      {state && 'error' in state ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
      {state && 'success' in state ? <p className="text-sm text-certified-success">Adjustment applied.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Applying…' : 'Apply adjustment'}
      </button>
    </form>
  );
}
