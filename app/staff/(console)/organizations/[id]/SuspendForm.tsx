'use client';

import { useActionState } from 'react';
import { suspendOrganization, reinstateOrganization, type SuspendState } from './actions';

export function SuspendForm({ organizationId, status }: { organizationId: string; status: string }) {
  const [suspendState, suspendAction, suspendPending] = useActionState<SuspendState, FormData>(suspendOrganization, null);
  const [reinstateState, reinstateAction, reinstatePending] = useActionState<SuspendState, FormData>(
    reinstateOrganization,
    null,
  );

  if (status === 'suspended') {
    return (
      <form action={reinstateAction} className="rounded-card border border-certified-border p-6">
        <input type="hidden" name="organization_id" value={organizationId} />
        <p className="mb-3 text-sm text-certified-warning">This organization is currently suspended.</p>
        <button
          type="submit"
          disabled={reinstatePending}
          className="rounded-control bg-certified-success px-4 py-2 text-white disabled:opacity-50"
        >
          {reinstatePending ? 'Reinstating…' : 'Reinstate'}
        </button>
        {reinstateState?.error ? <p className="mt-2 text-sm text-certified-danger">{reinstateState.error}</p> : null}
      </form>
    );
  }

  return (
    <form action={suspendAction} className="flex flex-col gap-2 rounded-card border border-certified-border p-6">
      <input type="hidden" name="organization_id" value={organizationId} />
      <h2 className="font-display text-lg text-certified-navy">Suspend</h2>
      <textarea
        name="reason"
        placeholder="Reason for suspension"
        required
        rows={2}
        className="rounded-control border border-certified-border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={suspendPending}
        className="self-start rounded-control bg-certified-danger px-4 py-2 text-white disabled:opacity-50"
      >
        {suspendPending ? 'Suspending…' : 'Suspend'}
      </button>
      {suspendState?.error ? <p className="text-sm text-certified-danger">{suspendState.error}</p> : null}
    </form>
  );
}
