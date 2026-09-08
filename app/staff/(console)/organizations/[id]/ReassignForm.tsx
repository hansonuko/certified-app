'use client';

import { useActionState } from 'react';
import { reassignAccountManager, type SuspendState } from './actions';

export function ReassignForm({
  organizationId,
  currentManagerId,
  managers,
}: {
  organizationId: string;
  currentManagerId: string | null;
  managers: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState<SuspendState, FormData>(reassignAccountManager, null);

  return (
    <form action={action} className="flex items-center gap-2 rounded-card border border-certified-border p-6">
      <input type="hidden" name="organization_id" value={organizationId} />
      <label className="flex items-center gap-2 text-sm text-certified-ink">
        Assigned Account Manager
        <select
          name="account_manager_id"
          defaultValue={currentManagerId ?? ''}
          className="rounded-control border border-certified-border px-2 py-1 text-sm"
        >
          <option value="">Unassigned</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-control bg-certified-navy px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
    </form>
  );
}
