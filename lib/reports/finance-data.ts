/**
 * Data readers for /staff/finance/reports (docs/build-phases.md Phase 9,
 * item 2). Both queries go through the regular per-request client (lib/
 * supabase/server.ts), not the service-role client — organizations_
 * finance_view and certificates_finance_view (supabase/migrations/
 * 0009_public_and_finance_views.sql, extended by 0025) already self-filter
 * on `is_finance() or is_admin()` in their own definitions, so an Account
 * Manager or issuer session gets zero rows back from these views rather
 * than needing an app-level role check here — same pattern as /staff/
 * audit-log's RLS-scoped reads.
 */
import { createClient } from '@/lib/supabase/server';

export type IssuanceMonthRow = { issue_month: string; status: string; certificate_count: number };
export type OrgGrowthRow = { id: string; name: string; plan: string | null; status: string; created_at: string; certificates_issued: number };

export async function getIssuanceVolumeByMonth(): Promise<IssuanceMonthRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('certificates_finance_view')
    .select('issue_month, status, certificate_count')
    .order('issue_month', { ascending: true });
  // certificates_finance_view groups by (org_id, status, month) — sum across
  // org_id here since the report is platform-wide, not per-org.
  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${row.issue_month}|${row.status}`;
    totals.set(key, (totals.get(key) ?? 0) + row.certificate_count);
  }
  return Array.from(totals.entries())
    .map(([key, certificate_count]) => {
      const [issue_month, status] = key.split('|');
      return { issue_month, status, certificate_count };
    })
    .sort((a, b) => a.issue_month.localeCompare(b.issue_month));
}

export async function getOrganizationGrowth(): Promise<OrgGrowthRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations_finance_view')
    .select('id, name, plan, status, created_at, certificates_issued')
    .order('created_at', { ascending: true });
  return data ?? [];
}
