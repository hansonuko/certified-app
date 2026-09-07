'use client';

import { useActionState, useState } from 'react';
import { inviteStaffMember, type TeamActionState } from './actions';

export function InviteForm() {
  const [state, action, pending] = useActionState<TeamActionState, FormData>(inviteStaffMember, null);
  const [role, setRole] = useState('account_manager');

  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-certified-border p-6">
      <h2 className="font-display text-lg text-certified-navy">Add a staff member</h2>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          name="name"
          placeholder="Full name"
          required
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        />
        <select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        >
          <option value="account_manager">Account Manager</option>
          <option value="finance">Finance</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {role === 'admin' ? (
        <label className="flex items-center gap-2 text-sm text-certified-warning">
          <input type="checkbox" name="confirm_admin" value="true" required />
          I understand this grants full Admin access to the platform.
        </label>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Adding…' : 'Add staff member'}
      </button>
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
    </form>
  );
}
