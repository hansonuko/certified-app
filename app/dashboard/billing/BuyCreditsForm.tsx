'use client';

import { useActionState, useState } from 'react';
import {
  initiateCreditPurchase,
  initiateFlutterwaveCharge,
  initiateFlutterwaveVirtualAccount,
  type BuyCreditsState,
} from './actions';
import { getMobileMoneyNetworksForCountry, USSD_BANKS } from '@/lib/payments/flutterwave-options';

const QUICK_AMOUNTS = [1, 10, 20, 50];

type FlutterwaveMethod = 'card' | 'mobile_money' | 'ussd' | 'opay' | 'bank_account' | 'virtual_account';

export function BuyCreditsForm({ initialQuantity = 20, orgCountry = null }: { initialQuantity?: number; orgCountry?: string | null }) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [provider, setProvider] = useState<'paystack' | 'flutterwave'>('paystack');
  const [flutterwaveMethod, setFlutterwaveMethod] = useState<FlutterwaveMethod>('card');
  const [mobileMoneyChoice, setMobileMoneyChoice] = useState({ network: '', countryCode: '' });

  const [paystackState, paystackAction, paystackPending] = useActionState<BuyCreditsState, FormData>(initiateCreditPurchase, null);
  const [flutterwaveState, flutterwaveAction, flutterwavePending] = useActionState<BuyCreditsState, FormData>(
    initiateFlutterwaveCharge,
    null,
  );
  // Dynamically generated virtual accounts (lib/payments/flutterwave-
  // virtual-accounts.ts) go through a genuinely different Flutterwave
  // endpoint than card/mobile money/USSD/opay/bank_account, so they're a
  // separate server action — dispatched to below based on which method is
  // selected, while staying inside the one visual "Flutterwave" form/card.
  const [virtualAccountState, virtualAccountAction, virtualAccountPending] = useActionState<BuyCreditsState, FormData>(
    initiateFlutterwaveVirtualAccount,
    null,
  );

  const payLabel = quantity === 1 ? 'Pay for certificate' : `Pay for ${quantity} certificates`;

  // Mobile money is only offered for the currencies Flutterwave actually
  // supports it in, given this app's supported billing currencies
  // (lib/payments/currency.ts) — Nigerian orgs don't see it at all, same as
  // USSD/opay/bank_account/virtual accounts are Nigeria-only below. See
  // lib/payments/flutterwave-options.ts.
  const mobileMoneyNetworks = getMobileMoneyNetworksForCountry(orgCountry);
  const isNigeria = orgCountry === 'Nigeria';

  const isVirtualAccount = flutterwaveMethod === 'virtual_account';
  const currentAction = isVirtualAccount ? virtualAccountAction : flutterwaveAction;
  const currentState = isVirtualAccount ? virtualAccountState : flutterwaveState;
  const currentPending = isVirtualAccount ? virtualAccountPending : flutterwavePending;
  const flutterwaveError = currentState && 'error' in currentState ? currentState.error : undefined;
  const flutterwaveInstructions = currentState && 'instructions' in currentState ? currentState.instructions : undefined;

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
          Flutterwave
        </label>
      </fieldset>

      {provider === 'paystack' ? (
        <form action={paystackAction} className="flex flex-col gap-3">
          <input type="hidden" name="quantity" value={quantity} />
          {paystackState && 'error' in paystackState ? <p className="text-sm text-certified-danger">{paystackState.error}</p> : null}
          <button
            type="submit"
            disabled={paystackPending}
            className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
          >
            {paystackPending ? 'Starting checkout…' : payLabel}
          </button>
        </form>
      ) : (
        <form action={currentAction} className="flex flex-col gap-4 rounded-card border border-certified-border p-4">
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="flutterwave_method" value={flutterwaveMethod} />

          {flutterwaveInstructions ? (
            // A charge is in flight (USSD dial code or mobile money
            // approval prompt) — hide the method form entirely rather than
            // let a second submit fire a second charge for the same top-up
            // while the first is pending.
            <div className="rounded-control border border-certified-navy bg-certified-navy/5 p-3 text-sm text-certified-ink">
              <p className="font-medium">Complete your payment</p>
              <p>{flutterwaveInstructions}</p>
              <p className="mt-1 text-xs text-certified-muted">
                Your balance updates automatically once payment is confirmed. Reload this page, or{' '}
                <a href="/dashboard/billing" className="underline">
                  start a new payment
                </a>{' '}
                if this one didn&apos;t go through.
              </p>
            </div>
          ) : (
            <>
              <fieldset className="flex flex-col gap-1 text-sm text-certified-ink">
                <legend className="mb-1">Pay via</legend>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={flutterwaveMethod === 'card'} onChange={() => setFlutterwaveMethod('card')} />
                    Card
                  </label>
                  {isNigeria ? (
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={flutterwaveMethod === 'ussd'} onChange={() => setFlutterwaveMethod('ussd')} />
                      USSD
                    </label>
                  ) : null}
                  {isNigeria ? (
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={flutterwaveMethod === 'bank_account'} onChange={() => setFlutterwaveMethod('bank_account')} />
                      Pay with bank
                    </label>
                  ) : null}
                  {isNigeria ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={flutterwaveMethod === 'virtual_account'}
                        onChange={() => setFlutterwaveMethod('virtual_account')}
                      />
                      Bank transfer
                    </label>
                  ) : null}
                  {isNigeria ? (
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={flutterwaveMethod === 'opay'} onChange={() => setFlutterwaveMethod('opay')} />
                      OPay
                    </label>
                  ) : null}
                  {mobileMoneyNetworks.length > 0 ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={flutterwaveMethod === 'mobile_money'}
                        onChange={() => setFlutterwaveMethod('mobile_money')}
                      />
                      Mobile money
                    </label>
                  ) : null}
                </div>
              </fieldset>

              {flutterwaveMethod === 'card' ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-certified-muted">
                    Card details are sent straight to this form&apos;s submit handler, encrypted immediately, and never stored.
                  </p>
                  <label className="flex flex-col gap-1 text-sm text-certified-ink">
                    Card number
                    <input
                      name="card_number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      required
                      className="rounded-control border border-certified-border px-3 py-2"
                    />
                  </label>
                  <div className="flex gap-3">
                    <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
                      Expiry month
                      <input
                        name="expiry_month"
                        inputMode="numeric"
                        placeholder="MM"
                        autoComplete="cc-exp-month"
                        required
                        className="rounded-control border border-certified-border px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
                      Expiry year
                      <input
                        name="expiry_year"
                        inputMode="numeric"
                        placeholder="YY"
                        autoComplete="cc-exp-year"
                        required
                        className="rounded-control border border-certified-border px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
                      CVV
                      <input
                        name="cvv"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        required
                        className="rounded-control border border-certified-border px-3 py-2"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-sm text-certified-ink">
                    Name on card (optional)
                    <input name="card_holder_name" autoComplete="cc-name" className="rounded-control border border-certified-border px-3 py-2" />
                  </label>
                </div>
              ) : null}

              {flutterwaveMethod === 'ussd' ? (
                <label className="flex flex-col gap-1 text-sm text-certified-ink">
                  Your bank
                  <select name="ussd_bank" required defaultValue="" className="rounded-control border border-certified-border px-3 py-2">
                    <option value="" disabled>
                      Select your bank
                    </option>
                    {USSD_BANKS.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-certified-muted">
                    You&apos;ll get a USSD code to dial from your phone to complete payment.
                  </span>
                </label>
              ) : null}

              {flutterwaveMethod === 'bank_account' ? (
                <p className="text-xs text-certified-muted">
                  You&apos;ll be redirected to pick your bank and authorize the debit (internet banking, OTP, or your
                  bank&apos;s own USSD code) — nothing to fill in here.
                </p>
              ) : null}

              {flutterwaveMethod === 'virtual_account' ? (
                <p className="text-xs text-certified-muted">
                  We&apos;ll generate a one-time account number for this exact amount — transfer into it from your own
                  banking app, and your balance updates once the transfer is confirmed.
                </p>
              ) : null}

              {flutterwaveMethod === 'opay' ? (
                <p className="text-xs text-certified-muted">You&apos;ll be redirected to OPay to authorize the payment — nothing to fill in here.</p>
              ) : null}

              {flutterwaveMethod === 'mobile_money' ? (
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm text-certified-ink">
                    Network
                    <select
                      required
                      defaultValue=""
                      onChange={(e) => {
                        const [network, countryCode] = e.target.value.split(':');
                        setMobileMoneyChoice({ network: network ?? '', countryCode: countryCode ?? '' });
                      }}
                      className="rounded-control border border-certified-border px-3 py-2"
                    >
                      <option value="" disabled>
                        Select your mobile money provider
                      </option>
                      {mobileMoneyNetworks.map((option) => (
                        <option key={`${option.network}-${option.countryCode}`} value={`${option.network}:${option.countryCode}`}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-certified-ink">
                    Mobile money phone number
                    <input
                      name="mobile_money_phone"
                      inputMode="numeric"
                      required
                      placeholder="e.g. 0244123456"
                      className="rounded-control border border-certified-border px-3 py-2"
                    />
                  </label>
                  {/* The select above carries "NETWORK:COUNTRY_CODE" together, just for a friendlier single dropdown — split into the two plain fields the server action actually reads, kept in sync via the select's own onChange. */}
                  <input type="hidden" name="mobile_money_network" value={mobileMoneyChoice.network} />
                  <input type="hidden" name="mobile_money_country_code" value={mobileMoneyChoice.countryCode} />
                </div>
              ) : null}

              {flutterwaveError ? <p className="text-sm text-certified-danger">{flutterwaveError}</p> : null}

              <button
                type="submit"
                disabled={currentPending}
                className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
              >
                {currentPending ? 'Processing…' : payLabel}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
