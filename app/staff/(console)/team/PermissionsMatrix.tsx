import { getPermissionMatrix, type StaffRole } from '@/lib/permissions';

const ROLE_COLUMNS: StaffRole[] = ['admin', 'account_manager', 'finance'];
const ROLE_LABEL: Record<StaffRole, string> = {
  admin: 'Admin',
  account_manager: 'Account Manager',
  finance: 'Finance',
};

// Turns 'review_applications' into 'Review applications' — good enough for
// a read-only reference table; not worth a hand-written label per action
// the way lib/email/staff-templates.ts's ROLE_LABEL is for user-facing copy.
function formatAction(action: string): string {
  const words = action.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Read-only permissions-matrix reference for /staff/team (staff-account-
 * management follow-up: "Admin can see what each role can do at a
 * glance"). Renders lib/permissions.ts's real MATRIX via
 * getPermissionMatrix() — display-only, this table is never itself
 * consulted to make an authorization decision anywhere in the app.
 */
export function PermissionsMatrix() {
  const matrix = getPermissionMatrix();

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-lg text-certified-navy">Permissions</h2>
      <p className="text-sm text-certified-muted">
        Read-only — matches lib/permissions.ts, the actual enforcement source of truth (docs/roles-permissions.md
        §2).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2 pr-4">Capability</th>
              {ROLE_COLUMNS.map((role) => (
                <th key={role} className="py-2 pr-4 text-center">
                  {ROLE_LABEL[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(({ action, roles }) => (
              <tr key={action} className="border-b border-certified-border">
                <td className="py-2 pr-4">{formatAction(action)}</td>
                {ROLE_COLUMNS.map((role) => (
                  <td key={role} className="py-2 pr-4 text-center">
                    {roles.includes(role) ? (
                      <span className="text-certified-success" aria-label="Allowed">
                        ✓
                      </span>
                    ) : (
                      <span className="text-certified-muted" aria-label="Not allowed">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
