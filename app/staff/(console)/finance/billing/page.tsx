import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

// /staff/finance/billing (docs/build-phases.md Phase 9, item 3). "Plan/
// pricing config (deferred until monetization)" per docs/sitemap.md §6 —
// docs/blueprint.md §10 lists "Paid tiers for issuers" as explicitly
// deferred to future development, so there's no real plan/invoice model to
// manage yet. Mirrors the issuer-facing placeholder's own minimal style
// (app/dashboard/billing/page.tsx: "You're on the Free plan.") rather than
// the generic ComingSoon copy, per that page's own comment about matching
// docs/sitemap.md's specific wording.
//
// Still reads real data rather than being pure static text: organizations.
// plan (added in supabase/migrations/0009_public_and_finance_views.sql,
// "next to the first thing that actually reads it") exists today even
// though nothing sets it to anything but null yet, so a plan-distribution
// count is honest, real (if trivial) content — and it's the exact shape
// real plan/invoice management would extend, not a page that has to be
// rebuilt from scratch when monetization ships.
export default async function FinanceBillingPage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'manage_billing')) redirect('/staff');

  const supabase = await createClient();
  const { data: orgs } = await supabase.from('organizations_finance_view').select('plan');

  const counts = new Map<string, number>();
  for (const org of orgs ?? []) {
    const label = org.plan ?? 'Free';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/staff/finance" className="text-sm text-certified-navy underline">
          ← Finance
        </Link>
        <h1 className="font-display text-2xl text-certified-navy">Billing</h1>
      </div>

      <p className="text-certified-muted">
        No paid plans yet — monetization hasn't shipped (docs/blueprint.md §10). Every organization is on the Free
        plan today; this page is the future home of plan/invoice management once that changes.
      </p>

      <table className="w-full max-w-sm text-left text-sm">
        <thead>
          <tr className="border-b border-certified-border text-certified-muted">
            <th className="py-2">Plan</th>
            <th className="py-2">Organizations</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(counts.entries()).map(([plan, count]) => (
            <tr key={plan} className="border-b border-certified-border">
              <td className="py-2">{plan}</td>
              <td className="py-2">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
