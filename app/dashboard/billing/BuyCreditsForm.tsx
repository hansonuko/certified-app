'use client';

import { useActionState, useState } from 'react';
import { initiateCreditPurchase, type BuyCreditsState } from './actions';

const QUICK_AMOUNTS = [1, 10, 20, 50];

export function BuyCreditsForm() {
  const [state, formAction, pending] = useActionState<BuyCreditsState, FormData>(initiateCreditPurchase, null);
  const [quantity, setQuantity] = useState(20);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQuantity(n)}
            className={`rounded-control border px-3 py-1.5 text-sm ${
              quantity === n
                ? 'border-certified-navy bg-certified-navy text-white'
                : 'border-certified-border text-certified-ink'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Quantity (custom amount)
        <input
          name="quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="w-40 rounded-control border border-certified-border px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-1 text-sm text-certified-ink">
        <legend className="mb-1">Payment provider</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="provider" value="flutterwave" defaultChecked />
          Flutterwave
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="provider" value="paystack" />
          Paystack
        </label>
      </fieldset>

      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Starting checkout…' : `Buy ${quantity} credit${quantity === 1 ? '' : 's'}`}
      </button>
    </form>
  );
}
