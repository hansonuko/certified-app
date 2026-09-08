import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { getPricingTiers, quoteCreditPurchase } from '@/lib/payments/pricing';
import { resolveCurrencyForCountry, getNgnRate, convertFromNgn } from '@/lib/payments/currency';
import { BuyCreditsForm } from './BuyCreditsForm';

// /dashboard/billing (docs/build-phases.md Phase 11 item 1 — Monetization
// Flow A). Replaces the "You're on the Free plan" placeholder now that
// certificate credits are the first real thing to bill for. Org membership/
// approval itself stays free forever (CLAUDE.md) — this page is purely
// about topping up the prepaid balance that gates certificate *issuance*
// (lib/certificates/issue.tsx), not anything to do with staying approved.
export default async function BillingPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const [{ data: org }, tiers, { data: transactions }] = await Promise.all([
    supabase.from('organizations').select('certificate_credits, address_country').eq('id', orgId).single(),
    getPricingTiers(supabase),
    supabase
      .from('certificate_credit_transactions')
      .select('id, type, quantity, total_amount, currency, balance_after, note, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const currency = resolveCurrencyForCountry(org?.address_country);
  const ngnRate = currency === 'NGN' ? 1 : await getNgnRate(supabase, currency);
  const fmt = (ngnAmount: number) => {
    const local = currency === 'NGN' ? ngnAmount : convertFromNgn(ngnAmount, ngnRate);
    return `${currency} ${local.toLocaleString()}`;
  };

  return (
    <main className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="font-display text-2xl text-certified-navy">Billing</h1>
        <p className="text-certified-muted">
          Organization membership, approval, and staying an approved issuer are free — always. Certificate credits are
          the only thing you ever pay for: one credit is spent per certificate issued, single or bulk.
        </p>
      </div>

      <section className="rounded-card border border-certified-border bg-certified-surface p-6">
        <p className="text-sm text-certified-muted">Current balance</p>
        <p className="font-display text-3xl text-certified-navy">{org?.certificate_credits ?? 0} credits</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">Buy certificate credits</h2>
        <table className="w-full max-w-lg text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Quantity</th>
              <th className="py-2">Discount</th>
              <th className="py-2">Price / credit</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((tier) => {
              const quote = quoteCreditPurchase(tier.minQuantity, tiers);
              return (
                <tr key={`${tier.minQuantity}-${tier.maxQuantity}`} className="border-b border-certified-border">
                  <td className="py-2">{tier.maxQuantity ? `${tier.minQuantity}–${tier.maxQuantity}` : `${tier.minQuantity}+`}</td>
                  <td className="py-2">{tier.discountPercent}%</td>
                  <td className="py-2">{fmt(quote.unitPriceNgn)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <BuyCreditsForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">Recent activity</h2>
        {!transactions || transactions.length === 0 ? (
          <p className="text-sm text-certified-muted">No credit activity yet.</p>
        ) : (
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Date</th>
                <th className="py-2">Type</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-certified-border">
                  <td className="py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="py-2 capitalize">{t.type.replace('_', ' ')}</td>
                  <td className="py-2">{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                  <td className="py-2">{t.total_amount ? `${t.currency} ${Number(t.total_amount).toLocaleString()}` : '—'}</td>
                  <td className="py-2">{t.balance_after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
