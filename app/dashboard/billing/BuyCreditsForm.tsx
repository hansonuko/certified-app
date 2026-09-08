'use client';

import { useActionState, useState } from 'react';
import { initiateCreditPurchase, initiateFlutterwaveCharge, type BuyCreditsState } from './actions';

const QUICK_AMOUNTS = [1, 10, 20, 50];

export function BuyCreditsForm({ initialQuantity = 20 }: { initialQuantity?: number }) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [provider, setProvider] = useState<'paystack' | 'flutterwave'>('paystack');

  const [paystackState, paystackAction, paystackPending] = useActionState<BuyCreditsState, FormData>(initiateCreditPurchase, null);
  const [flutterwaveState, flutterwaveAction, flutterwavePending] = useActionState<BuyCreditsState, FormData>(
    initiateFlutterwaveCharge,
    null,
  );

  const payLabel = quantity === 1 ? 'Pay for certificate' : `Pay for ${quantity} certificates`;

  return (
    <div className="flex flex-col gap-4">
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
          <input type="radio" checked={provider === 'paystack'} onChange={() => setProvider('paystack')} />
          Paystack
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={provider === 'flutterwave'} onChange={() => setProvider('flutterwave')} />
          Flutterwave (card)
        </label>
      </fieldset>

      {provider === 'paystack' ? (
        <form action={paystackAction} className="flex flex-col gap-3">
          <input type="hidden" name="quantity" value={quantity} />
          {paystackState?.error ? <p className="text-sm text-certified-danger">{paystackState.error}</p> : null}
          <button
            type="submit"
            disabled={paystackPending}
            className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
          >
            {paystackPending ? 'Starting checkout…' : payLabel}
          </button>
        </form>
      ) : (
        <form action={flutterwaveAction} className="flex flex-col gap-3 rounded-card border border-certified-border p-4">
          <input type="hidden" name="quantity" value={quantity} />
          <p className="text-xs text-certified-muted">
            Card details are sent straight to this form&apos;s submit handler, encrypted immediately, and never stored.
          </p>
          <label className="flex flex-col gap-1 text-sm text-certified-ink">
            Card number
            <input name="card_number" inputMode="numeric" autoComplete="cc-number" required className="rounded-control border border-certified-border px-3 py-2" />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
              Expiry month
              <input name="expiry_month" inputMode="numeric" placeholder="MM" autoComplete="cc-exp-month" required className="rounded-control border border-certified-border px-3 py-2" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
              Expiry year
              <input name="expiry_year" inputMode="numeric" placeholder="YY" autoComplete="cc-exp-year" required className="rounded-control border border-certified-border px-3 py-2" />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
              CVV
              <input name="cvv" inputMode="numeric" autoComplete="cc-csc" required className="rounded-control border border-certified-border px-3 py-2" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-certified-ink">
            Name on card (optional)
            <input name="card_holder_name" autoComplete="cc-name" className="rounded-control border border-certified-border px-3 py-2" />
          </label>
          {flutterwaveState?.error ? <p className="text-sm text-certified-danger">{flutterwaveState.error}</p> : null}
          <button
            type="submit"
            disabled={flutterwavePending}
            className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
          >
            {flutterwavePending ? 'Processing…' : payLabel}
          </button>
        </form>
      )}
    </div>
  );
}
