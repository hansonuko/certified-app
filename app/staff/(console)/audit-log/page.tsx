import { requireStaffSession } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';

const ACTION_LABEL: Record<string, string> = {
  application_approved: 'Application approved',
  application_rejected: 'Application rejected',
  application_more_info_requested: 'Application — more info requested',
  organization_suspended: 'Organization suspended',
  organization_reinstated: 'Organization reinstated',
  organization_reassigned: 'Organization reassigned to a different Account Manager',
  organization_manually_created: 'Organization manually added by staff',
  certificate_revoked: 'Certificate revoked',
  staff_account_invited: 'Staff account invited',
  staff_role_changed: 'Staff role changed',
  staff_account_suspended: 'Staff account suspended',
  staff_account_reinstated: 'Staff account reinstated',
  staff_account_deactivated: 'Staff account deactivated',
  bootstrap_admin_created: 'First Admin bootstrapped',
};

const ROW_LIMIT = 200;

// /staff/audit-log (docs/build-phases.md Phase 2.75, docs/roles-
// permissions.md §2). Every role has `view_audit_log` in the matrix — the
// difference is scope, not access — so there's no can()/redirect gate here
// the way other Admin-only pages have one. The scoping itself is enforced
// by supabase/migrations/0008_audit_log.sql's two RLS policies
// (audit_log_admin_select: full table; audit_log_self_select: actor_id =
// auth.uid()) — reading through the regular per-request client (not
// lib/supabase/admin.ts's service-role client, which would bypass RLS and
// silently show everyone the full log) is what makes that automatic:
// Account Manager and Finance get the "own actions only" view without any
// role branching in this file at all.
export default async function AuditLogPage() {
  const { role } = await requireStaffSession();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from('audit_log')
    .select('id, actor_id, actor_type, action, target_type, target_id, before, after, at')
    .order('at', { ascending: false })
    .limit(ROW_LIMIT);

  const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter((id): id is string => !!id)));
  let actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from('admin_users').select('id, name').in('id', actorIds);
    actorNames = new Map((actors ?? []).map((a) => [a.id, a.name]));
  }

  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Audit Log</h1>
      {role !== 'admin' ? (
        <p className="text-sm text-certified-muted">Showing your own actions only.</p>
      ) : (
        <p className="text-sm text-certified-muted">Showing the most recent {ROW_LIMIT} actions, platform-wide.</p>
      )}

      {!rows || rows.length === 0 ? (
        <p className="text-certified-muted">No audit log entries yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">When</th>
              <th className="py-2">Actor</th>
              <th className="py-2">Action</th>
              <th className="py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-certified-border align-top">
                <td className="py-2 whitespace-nowrap">{new Date(row.at).toLocaleString()}</td>
                <td className="py-2">
                  {row.actor_type === 'system' ? 'System' : (row.actor_id && actorNames.get(row.actor_id)) || 'Unknown'}
                </td>
                <td className="py-2">{ACTION_LABEL[row.action] ?? row.action}</td>
                <td className="py-2 text-certified-muted">
                  {row.target_type}
                  {row.target_id ? ` · ${row.target_id.slice(0, 8)}…` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
