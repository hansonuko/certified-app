'use client';

import { useActionState } from 'react';
import { updateCurrencyRate, type PricingActionState } from './actions';

export function CurrencyRateRow({ currency, ngnRate }: { currency: string; ngnRate: number }) {
  const [state, formAction, pending] = useActionState<PricingActionState, FormData>(updateCurrencyRate, null);

  return (
    <tr className="border-b border-certified-border align-top">
      <td className="py-2">{currency}</td>
      <td className="py-2">
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="currency" value={currency} />
          <input
            name="ngn_rate"
            type="number"
            min={0}
            step="0.000001"
            defaultValue={ngnRate}
            className="w-32 rounded-control border border-certified-border px-2 py-1 text-sm"
            disabled={currency === 'NGN'}
          />
          <button
            type="submit"
            disabled={pending || currency === 'NGN'}
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
