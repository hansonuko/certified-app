'use client';

import { useActionState, useState } from 'react';
import {
  changeStaffRole,
  suspendStaffMember,
  reinstateStaffMember,
  type TeamActionState,
} from './actions';

export function StaffRow({
  staffId,
  currentRole,
  status,
  isSelf,
}: {
  staffId: string;
  currentRole: string;
  status: string;
  isSelf: boolean;
}) {
  const [roleState, roleAction, rolePending] = useActionState<TeamActionState, FormData>(changeStaffRole, null);
  const [suspendState, suspendAction, suspendPending] = useActionState<TeamActionState, FormData>(
    suspendStaffMember,
    null,
  );
  const [reinstateState, reinstateAction, reinstatePending] = useActionState<TeamActionState, FormData>(
    reinstateStaffMember,
    null,
  );
  const [selectedRole, setSelectedRole] = useState(currentRole);

  if (isSelf) {
    return <span className="text-certified-muted">— (you)</span>;
  }

  const error = roleState?.error ?? suspendState?.error ?? reinstateState?.error;

  return (
    <div className="flex flex-col gap-1">
      <form action={roleAction} className="flex items-center gap-2">
        <input type="hidden" name="staff_id" value={staffId} />
        <select
          name="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded-control border border-certified-border px-2 py-1 text-xs"
        >
          <option value="account_manager">Account Manager</option>
          <option value="finance">Finance</option>
          <option value="admin">Admin</option>
        </select>
        {selectedRole === 'admin' && currentRole !== 'admin' ? (
          <label className="flex items-center gap-1 text-xs text-certified-warning">
            <input type="checkbox" name="confirm_admin" value="true" required />
            Confirm
          </label>
        ) : null}
        <button
          type="submit"
          disabled={rolePending || selectedRole === currentRole}
          className="rounded-control border border-certified-border px-2 py-1 text-xs disabled:opacity-50"
        >
          {rolePending ? 'Saving…' : 'Save role'}
        </button>
      </form>

      {status === 'suspended' ? (
        <form action={reinstateAction}>
          <input type="hidden" name="staff_id" value={staffId} />
          <button
            type="submit"
            disabled={reinstatePending}
            className="rounded-control bg-certified-success px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            {reinstatePending ? 'Reinstating…' : 'Reinstate'}
          </button>
        </form>
      ) : (
        <form action={suspendAction}>
          <input type="hidden" name="staff_id" value={staffId} />
          <button
            type="submit"
            disabled={suspendPending}
            className="rounded-control bg-certified-danger px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            {suspendPending ? 'Suspending…' : 'Suspend'}
          </button>
        </form>
      )}

      {error ? <p className="text-xs text-certified-danger">{error}</p> : null}
    </div>
  );
}
