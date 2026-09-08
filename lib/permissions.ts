// The server-side enforcement layer described in docs/roles-permissions.md §3.
// Every /staff/* API route or server action must call `can(role, action)` before
// doing anything — this is the actual security boundary. Hiding a nav item or
// button for a role that lacks a capability is UX only (CLAUDE.md rule #9);
// Supabase RLS policies (supabase/migrations) are the second, independent layer.
//
// Anything not explicitly listed as allowed below is denied by default
// (docs/roles-permissions.md §2, closing note) — `can()` returns false for any
// action/role pair it doesn't recognize, never throws, never falls open.

export type StaffRole = 'admin' | 'account_manager' | 'finance';

// One entry per row of the permission matrix in docs/roles-permissions.md §2.
export type StaffAction =
  | 'review_applications' // approve / request-info / reject
  | 'view_kyc_documents' // ID, CAC, NIN, declaration
  | 'view_organizations' // read-only, no KYC docs — Finance gets limited columns, see note below
  | 'suspend_organization'
  | 'view_certificates' // Finance gets aggregate/statistical only, see note below
  | 'revoke_certificate'
  | 'moderate_directory'
  | 'handle_support_queue'
  | 'view_operational_analytics'
  | 'view_cost_usage_dashboard'
  | 'manage_billing'
  | 'export_financial_reports'
  | 'manage_staff_accounts' // invite/create Account Manager & Finance, change role, suspend
  | 'manage_admin_accounts' // change another Admin's role or suspend an Admin
  | 'manage_system_settings' // certificate templates, rate-limit thresholds, integration key status
  | 'rotate_signing_secret'
  | 'view_audit_log' // Admin sees all; Account Manager/Finance see own actions only, see note below
  | 'override_staff_decision';

const MATRIX: Record<StaffAction, ReadonlyArray<StaffRole>> = {
  review_applications: ['admin', 'account_manager'],
  view_kyc_documents: ['admin', 'account_manager'],
  view_organizations: ['admin', 'account_manager', 'finance'],
  suspend_organization: ['admin', 'account_manager'],
  view_certificates: ['admin', 'account_manager', 'finance'],
  revoke_certificate: ['admin', 'account_manager'],
  moderate_directory: ['admin', 'account_manager'],
  handle_support_queue: ['admin', 'account_manager'],
  view_operational_analytics: ['admin', 'account_manager'],
  view_cost_usage_dashboard: ['admin', 'finance'],
  manage_billing: ['admin', 'finance'],
  export_financial_reports: ['admin', 'finance'],
  manage_staff_accounts: ['admin'],
  manage_admin_accounts: ['admin'],
  manage_system_settings: ['admin'],
  rotate_signing_secret: ['admin'],
  view_audit_log: ['admin', 'account_manager', 'finance'],
  override_staff_decision: ['admin'],
};

// Actions where `can()` returning true is only half the enforcement — the route
// must additionally scope the query itself. `can()` can't express "yes, but only
// these columns" or "yes, but only your own rows" as a boolean, so that scoping
// has to live in the route/query, guided by these notes:
//
// - view_organizations: Finance's result set must select only
//   name/plan/status/usage columns — never KYC fields (id_document_url, nin,
//   owner contact info).
// - view_certificates: Finance's result set must be an aggregate/statistical
//   view (counts, sums) — never individual certificate/trainee rows.
// - view_audit_log: Account Manager and Finance must have the query filtered to
//   `actor_id = <their own id>` — only Admin gets the unfiltered log.
export const SCOPED_ACTIONS: ReadonlySet<StaffAction> = new Set([
  'view_organizations',
  'view_certificates',
  'view_audit_log',
]);

/**
 * The single source of truth for "can this staff role do this?" — see
 * docs/roles-permissions.md §2 for the human-readable matrix this implements.
 * Call this first, before any DB read/write, in every /staff/* API route or
 * server action (docs/roles-permissions.md §3). Unknown actions are denied,
 * not treated as an error — never let a typo silently fall open.
 */
export function can(role: StaffRole, action: StaffAction): boolean {
  return MATRIX[action]?.includes(role) ?? false;
}

/**
 * Read-only view of MATRIX for /staff/team's permissions-matrix display
 * (docs/build-phases.md's staff-account-management follow-up — "Admin can
 * see what each role can do at a glance"). Display-only: nothing reads this
 * to make an authorization decision, `can()` above remains the only
 * enforcement path. Returned as an array (not the raw MATRIX object) so a
 * caller can't accidentally mutate the real matrix through a shared
 * reference.
 */
export function getPermissionMatrix(): ReadonlyArray<{ action: StaffAction; roles: ReadonlyArray<StaffRole> }> {
  return (Object.keys(MATRIX) as StaffAction[]).map((action) => ({ action, roles: MATRIX[action] }));
}
