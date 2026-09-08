import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

// /staff/finance/wallets (Monetization Flow A follow-up, user-requested:
// "build the admin wallet properly" — Admin/Finance previously had no way
// to see any organization's certificate-credit balance at all, only the
// aggregate credits-sold stat on /staff/finance/billing). Sourced from
// organizations_finance_view (extended by supabase/migrations/0033 to
// carry certificate_credits) — the same "Finance can't read the base
// organizations table directly" pattern every other Finance-facing list
// in this app already uses.
export default async function WalletsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) redirect('/staff');

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('organizations_finance_view')
    .select('id, name, certificate_credits')
    .order('certificate_credits', { ascending: false });
  if (q) query = query.ilike('name', `%${q}%`);

  const [{ data: orgs }, { data: stalePayments }] = await Promise.all([
    query,
    // Payments that have sat 'pending' for 15+ minutes — the practical
    // signature of "webhook never arrived AND the payer never landed back
    // on the callback page" (both drive confirmation, docs/session-
    // handoff.md §20/§21), or a genuine amount/currency mismatch
    // (lib/payments/confirm.ts's 'mismatch' outcome, which deliberately
    // leaves the row pending rather than marking it failed). Surfaced here
    // so staff have a concrete place to notice and manually credit via the
    // adjustment form below, closing the loop on "once payment is made, it
    // reflects on the wallet" even in the cases automatic confirmation
    // didn't complete.
    supabase
      .from('payments')
      .select('id, org_id, provider, quantity, amount, currency, created_at')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true })
      .limit(20),
  ]);

  const staleOrgIds = Array.from(new Set((stalePayments ?? []).map((p) => p.org_id)));
  let staleOrgNames = new Map<string, string>();
  if (staleOrgIds.length > 0) {
    const { data: staleOrgs } = await supabase.from('organizations_finance_view').select('id, name').in('id', staleOrgIds);
    staleOrgNames = new Map((staleOrgs ?? []).map((o) => [o.id, o.name]));
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/staff/finance" className="text-sm text-certified-navy underline">
          ← Finance
        </Link>
        <h1 className="font-display text-2xl text-certified-navy">Wallets</h1>
        <p className="text-sm text-certified-muted">
          Every organization&apos;s certificate-credit balance. Click through to see the full ledger or make a manual
          adjustment (goodwill refund, correcting a support-desk error) — every adjustment is audit-logged.
        </p>
      </div>

      {(stalePayments ?? []).length > 0 ? (
        <section className="flex flex-col gap-2 rounded-card border border-certified-warning bg-certified-surface-2 p-4">
          <h2 className="font-display text-lg text-certified-navy">
            {stalePayments!.length} payment{stalePayments!.length === 1 ? '' : 's'} stuck pending 15+ minutes
          </h2>
          <p className="text-sm text-certified-ink">
            Neither the webhook nor the payer&apos;s own callback-page visit confirmed these — check the provider
            dashboard for the real outcome, then credit manually below if the charge actually succeeded.
          </p>
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Organization</th>
                <th className="py-2">Provider</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Since</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {stalePayments!.map((p) => (
                <tr key={p.id} className="border-b border-certified-border">
                  <td className="py-2">{staleOrgNames.get(p.org_id) ?? p.org_id}</td>
                  <td className="py-2 capitalize">{p.provider}</td>
                  <td className="py-2">{p.quantity ?? '—'}</td>
                  <td className="py-2">
                    {p.currency} {Number(p.amount).toLocaleString()}
                  </td>
                  <td className="py-2">{new Date(p.created_at).toLocaleString()}</td>
                  <td className="py-2">
                    <Link href={`/staff/finance/wallets/${p.org_id}`} className="text-certified-navy underline">
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <form className="max-w-sm">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search organizations…"
          className="w-full rounded-control border border-certified-border px-3 py-2 text-sm"
        />
      </form>

      <table className="w-full max-w-2xl text-left text-sm">
        <thead>
          <tr className="border-b border-certified-border text-certified-muted">
            <th className="py-2">Organization</th>
            <th className="py-2">Balance</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {(orgs ?? []).map((org) => (
            <tr key={org.id} className="border-b border-certified-border">
              <td className="py-2">{org.name}</td>
              <td className="py-2">{org.certificate_credits} credits</td>
              <td className="py-2">
                <Link href={`/staff/finance/wallets/${org.id}`} className="text-certified-navy underline">
                  View ledger →
                </Link>
              </td>
            </tr>
          ))}
          {(orgs ?? []).length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 text-certified-muted">
                No organizations found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
