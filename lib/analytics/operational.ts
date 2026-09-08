/**
 * Data readers for /staff/analytics (docs/build-phases.md Phase 9, item 4).
 * Admin + Account Manager, both unscoped — `view_operational_analytics` is
 * not in lib/permissions.ts's SCOPED_ACTIONS set (unlike view_organizations/
 * view_certificates/view_audit_log), so Account Manager sees the same
 * platform-wide picture Admin does, not a "my own" subset.
 *
 * Certificates/organizations/trainees are read through the regular
 * per-request client — their existing staff RLS policies
 * (certificates_staff_select, organizations_staff_all, trainees_staff_all)
 * already admit both roles unscoped, so no service-role client is needed
 * there. Approvals/rejections is the one exception: it reads audit_log,
 * whose RLS scopes Account Manager to "own actions only"
 * (audit_log_self_select) — correct for /staff/audit-log, wrong here, since
 * this page's own capability is deliberately unscoped. That query goes
 * through lib/supabase/admin.ts instead, gated by the page's own
 * `can(role, 'view_operational_analytics')` check rather than by RLS —
 * the same "service-role client for a query RLS can't shape correctly"
 * pattern already used by app/staff/(console)/team/actions.ts.
 *
 * No aggregate views/RPCs exist for any of this (unlike Finance's pre-
 * aggregated certificates_finance_view, which also isn't reusable here
 * since it excludes Account Manager entirely) — rows are fetched and
 * grouped in JS, the same "deliberate v1 shortcut" already used by
 * app/directory/page.tsx's groupByTrainee for a similar reason.
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type MonthCount = { month: string; count: number };
export type MonthStatusCount = { month: string; status: string; count: number };

function toMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // 'YYYY-MM-DD...' -> 'YYYY-MM'
}

export async function getIssuanceVolumeByMonth(): Promise<MonthStatusCount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('certificates').select('issue_date, status');

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    const key = `${toMonth(row.issue_date)}|${row.status}`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  return Array.from(totals.entries())
    .map(([key, count]) => {
      const [month, status] = key.split('|');
      return { month, status, count };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getApprovalsRejectionsByMonth(): Promise<MonthStatusCount[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('audit_log')
    .select('at, action')
    .in('action', ['application_approved', 'application_rejected']);

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    const label = row.action === 'application_approved' ? 'approved' : 'rejected';
    const key = `${toMonth(row.at)}|${label}`;
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  return Array.from(totals.entries())
    .map(([key, count]) => {
      const [month, status] = key.split('|');
      return { month, status, count };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export type FieldCount = { field: string; count: number };

/** organizations.training_fields is free text (docs/blueprint.md §3.1's "Field(s) of training"), comma-separated by convention (app/(auth)/apply/ApplyForm.tsx's field label) rather than a real array column — split/trim/count is the best this data shape supports. */
export async function getTopTrainingFields(): Promise<FieldCount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('organizations').select('training_fields').not('training_fields', 'is', null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const field of (row.training_fields ?? '').split(',')) {
      const trimmed = field.trim();
      if (!trimmed) continue;
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count);
}

export type RegionCount = { region: string; count: number };

/** "Geographic spread by state" (docs/blueprint.md §9) — trainees.region post pan-African rebrand (supabase/migrations/0017 renamed state -> region); every trainee counts here, not just ones with an active certificate (unlike trainees_public_view's directory-facing filter), since this is an internal operational view, not the public directory. */
export async function getGeographicSpread(): Promise<RegionCount[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('trainees').select('region').not('region', 'is', null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const region = (row.region ?? '').trim();
    if (!region) continue;
    counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}

export type IssuanceAnomaly = { orgId: string; orgName: string; month: string; count: number; averageCount: number };

const ANOMALY_MIN_COUNT = 5; // below this, a ratio spike is just noise (e.g. 1 cert vs. 0 average is an "infinite" ratio that means nothing)
const ANOMALY_RATIO = 3; // this codebase's own threshold, not a documented industry figure — flagged the same way UsageTile's 70/90% warning bands are

/**
 * "Anomaly alerts on unusual issuance volume/spikes" (docs/blueprint.md §6,
 * the "Issuer account compromise → mass-issuing fraudulent certs"
 * mitigation). Flags an org's most recent active month if its count is at
 * least ANOMALY_RATIO times that org's own historical average across all
 * its other active months — a compromised or abusive account issuing far
 * more than its own normal pace, not a comparison against other orgs (a
 * naturally high-volume org isn't itself suspicious).
 */
export async function getIssuanceAnomalies(): Promise<IssuanceAnomaly[]> {
  const supabase = await createClient();
  const [certsResult, orgsResult] = await Promise.all([
    supabase.from('certificates').select('org_id, issue_date'),
    supabase.from('organizations').select('id, display_name'),
  ]);

  const orgNames = new Map((orgsResult.data ?? []).map((o) => [o.id, o.display_name]));
  const perOrgMonth = new Map<string, Map<string, number>>();
  for (const row of certsResult.data ?? []) {
    const month = toMonth(row.issue_date);
    if (!perOrgMonth.has(row.org_id)) perOrgMonth.set(row.org_id, new Map());
    const monthMap = perOrgMonth.get(row.org_id)!;
    monthMap.set(month, (monthMap.get(month) ?? 0) + 1);
  }

  const anomalies: IssuanceAnomaly[] = [];
  for (const [orgId, monthMap] of perOrgMonth) {
    const months = Array.from(monthMap.keys()).sort();
    const latestMonth = months[months.length - 1];
    const latestCount = monthMap.get(latestMonth)!;
    const otherMonths = months.slice(0, -1);
    if (otherMonths.length === 0) continue; // no history yet to compare against
    const average = otherMonths.reduce((sum, m) => sum + monthMap.get(m)!, 0) / otherMonths.length;
    if (latestCount >= ANOMALY_MIN_COUNT && average > 0 && latestCount >= average * ANOMALY_RATIO) {
      anomalies.push({ orgId, orgName: orgNames.get(orgId) ?? orgId, month: latestMonth, count: latestCount, averageCount: Math.round(average * 10) / 10 });
    }
  }
  return anomalies.sort((a, b) => b.count / b.averageCount - a.count / a.averageCount);
}
