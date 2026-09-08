import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { AdjustWalletForm } from './AdjustWalletForm';

const TYPE_LABEL: Record<string, string> = {
  purchase: 'Purchase',
  issuance_spend: 'Certificate issued',
  refund: 'Refund',
  manual_adjustment: 'Manual adjustment',
};

// /staff/finance/wallets/[id] — one organization's full credit ledger +
// the manual-adjustment action (Monetization Flow A follow-up). Admin/
// Finance only, same manage_billing gate as the list page and
// /staff/finance/billing.
export default async function WalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) redirect('/staff');

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: org }, { data: transactions }] = await Promise.all([
    supabase.from('organizations_finance_view').select('id, name, certificate_credits').eq('id', id).maybeSingle(),
    supabase
      .from('certificate_credit_transactions')
      .select('id, type, quantity, total_amount, currency, balance_after, note, created_at')
      .eq('org_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!org) notFound();

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/staff/finance/wallets" className="text-sm text-certified-navy underline">
          ← Wallets
        </Link>
        <h1 className="font-display text-2xl text-certified-navy">{org.name}</h1>
        <p className="text-2xl text-certified-navy">{org.certificate_credits} credits</p>
      </div>

      <AdjustWalletForm orgId={org.id} />

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Ledger (last 50)</h2>
        {!transactions || transactions.length === 0 ? (
          <p className="text-sm text-certified-muted">No activity yet.</p>
        ) : (
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Date</th>
                <th className="py-2">Type</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Balance after</th>
                <th className="py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-certified-border">
                  <td className="py-2">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="py-2">{TYPE_LABEL[t.type] ?? t.type}</td>
                  <td className="py-2">{t.quantity > 0 ? `+${t.quantity}` : t.quantity}</td>
                  <td className="py-2">{t.total_amount ? `${t.currency} ${Number(t.total_amount).toLocaleString()}` : '—'}</td>
                  <td className="py-2">{t.balance_after}</td>
                  <td className="py-2 text-certified-muted">{t.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
