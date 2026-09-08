import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { TierRow } from './TierRow';
import { CurrencyRateRow } from './CurrencyRateRow';

// /staff/finance/billing (docs/build-phases.md Phase 9 item 3, now
// superseded by Phase 11 item 1 — Monetization Flow A). This used to be a
// "no paid plans yet" placeholder (docs/blueprint.md §10 listed "paid tiers
// for issuers" as explicitly deferred); certificate credits are the first
// real thing to configure here, so the placeholder copy is gone. Pricing
// tier discounts and currency rates are editable live by Admin/Finance —
// the user-requested capability to adjust discount percentages "at any
// given time" without a redeploy — each edit writes an AuditLog row
// (TierRow/CurrencyRateRow's actions.ts).
export default async function FinanceBillingPage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) redirect('/staff');

  const supabase = await createClient();

  const [{ data: orgs }, { data: tiers }, { data: rates }, { data: stats }] = await Promise.all([
    supabase.from('organizations_finance_view').select('plan'),
    supabase
      .from('certificate_credit_pricing_tiers')
      .select('id, min_quantity, max_quantity, discount_percent')
      .order('min_quantity', { ascending: true }),
    supabase.from('payment_currency_rates').select('currency, ngn_rate').order('currency', { ascending: true }),
    supabase.from('certificate_credit_transactions').select('type, quantity, total_amount, currency').eq('type', 'purchase'),
  ]);

  const planCounts = new Map<string, number>();
  for (const org of orgs ?? []) {
    const label = org.plan ?? 'Free';
    planCounts.set(label, (planCounts.get(label) ?? 0) + 1);
  }

  const creditsSold = (stats ?? []).reduce((sum, row) => sum + row.quantity, 0);
  const revenueByCurrency = new Map<string, number>();
  for (const row of stats ?? []) {
    if (!row.currency || !row.total_amount) continue;
    revenueByCurrency.set(row.currency, (revenueByCurrency.get(row.currency) ?? 0) + Number(row.total_amount));
  }

  return (
    <main className="flex flex-col gap-8 p-8">
      <div>
        <Link href="/staff/finance" className="text-sm text-certified-navy underline">
          ← Finance
        </Link>
        <h1 className="font-display text-2xl text-certified-navy">Billing</h1>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg text-certified-navy">Certificate credits sold (all-time)</h2>
          <Link href="/staff/finance/wallets" className="text-sm text-certified-navy underline">
            View per-org wallets →
          </Link>
        </div>
        <p className="text-2xl text-certified-navy">{creditsSold.toLocaleString()} credits</p>
        {revenueByCurrency.size > 0 ? (
          <ul className="text-sm text-certified-muted">
            {Array.from(revenueByCurrency.entries()).map(([currency, amount]) => (
              <li key={currency}>
                {currency} {amount.toLocaleString()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-certified-muted">No credit purchases yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg text-certified-navy">Certificate-credit pricing tiers</h2>
          <p className="text-sm text-certified-muted">
            Base price is ₦1,000/credit. Discount percentages below apply on top of that — edit and save any row,
            takes effect immediately for every organization&apos;s next checkout.
          </p>
        </div>
        <table className="w-full max-w-md text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Quantity</th>
              <th className="py-2">Discount</th>
            </tr>
          </thead>
          <tbody>
            {(tiers ?? []).map((tier) => (
              <TierRow
                key={tier.id}
                id={tier.id}
                minQuantity={tier.min_quantity}
                maxQuantity={tier.max_quantity}
                discountPercent={Number(tier.discount_percent)}
              />
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg text-certified-navy">Currency rates ("₦1 = ")</h2>
          <p className="text-sm text-certified-muted">
            No live FX feed (docs/build-phases.md Phase 11) — these are manually maintained and should be checked
            periodically. NGN is the fixed anchor (rate 1) and can&apos;t be edited.
          </p>
        </div>
        <table className="w-full max-w-md text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Currency</th>
              <th className="py-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {(rates ?? []).map((rate) => (
              <CurrencyRateRow key={rate.currency} currency={rate.currency} ngnRate={Number(rate.ngn_rate)} />
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Organizations by plan</h2>
        <table className="w-full max-w-sm text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Plan</th>
              <th className="py-2">Organizations</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(planCounts.entries()).map(([plan, count]) => (
              <tr key={plan} className="border-b border-certified-border">
                <td className="py-2">{plan}</td>
                <td className="py-2">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
