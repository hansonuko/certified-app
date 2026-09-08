'use client';

import { useActionState } from 'react';
import { updatePricingTier, type PricingActionState } from './actions';

export function TierRow({
  id,
  minQuantity,
  maxQuantity,
  discountPercent,
}: {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
}) {
  const [state, formAction, pending] = useActionState<PricingActionState, FormData>(updatePricingTier, null);

  return (
    <tr className="border-b border-certified-border align-top">
      <td className="py-2">{maxQuantity ? `${minQuantity}–${maxQuantity}` : `${minQuantity}+`}</td>
      <td className="py-2">
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="tier_id" value={id} />
          <input
            name="discount_percent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={discountPercent}
            className="w-20 rounded-control border border-certified-border px-2 py-1 text-sm"
          />
          <span className="text-sm text-certified-muted">%</span>
          <button
            type="submit"
            disabled={pending}
            className="rounded-control border border-certified-border px-3 py-1 text-sm disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
        </form>
        {state && 'error' in state ? <p className="mt-1 text-xs text-certified-danger">{state.error}</p> : null}
        {state && 'success' in state ? <p className="mt-1 text-xs text-certified-success">Updated.</p> : null}
      </td>
    </tr>
  );
}
