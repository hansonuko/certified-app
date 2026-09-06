'use client';

import { useActionState } from 'react';
import { approveApplication, requestMoreInfo, rejectApplication, type DecisionState } from './actions';

export function DecisionForms({ applicationId }: { applicationId: string }) {
  const [approveState, approveAction, approvePending] = useActionState<DecisionState, FormData>(approveApplication, null);
  const [infoState, infoAction, infoPending] = useActionState<DecisionState, FormData>(requestMoreInfo, null);
  const [rejectState, rejectAction, rejectPending] = useActionState<DecisionState, FormData>(rejectApplication, null);

  return (
    <div className="flex flex-col gap-4 rounded-card border border-certified-border p-6">
      <h2 className="font-display text-lg text-certified-navy">Decision</h2>

      <form action={approveAction}>
        <input type="hidden" name="application_id" value={applicationId} />
        <button
          type="submit"
          disabled={approvePending}
          className="rounded-control bg-certified-success px-4 py-2 text-white disabled:opacity-50"
        >
          {approvePending ? 'Approving…' : 'Approve'}
        </button>
        {approveState?.error ? <p className="mt-1 text-sm text-certified-danger">{approveState.error}</p> : null}
      </form>

      <form action={infoAction} className="flex flex-col gap-2">
        <input type="hidden" name="application_id" value={applicationId} />
        <textarea
          name="reason"
          placeholder="What's missing or unclear?"
          required
          rows={2}
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={infoPending}
          className="self-start rounded-control bg-certified-warning px-4 py-2 text-white disabled:opacity-50"
        >
          {infoPending ? 'Sending…' : 'Request more info'}
        </button>
        {infoState?.error ? <p className="text-sm text-certified-danger">{infoState.error}</p> : null}
      </form>

      <form action={rejectAction} className="flex flex-col gap-2">
        <input type="hidden" name="application_id" value={applicationId} />
        <textarea
          name="reason"
          placeholder="Reason for rejection"
          required
          rows={2}
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={rejectPending}
          className="self-start rounded-control bg-certified-danger px-4 py-2 text-white disabled:opacity-50"
        >
          {rejectPending ? 'Rejecting…' : 'Reject'}
        </button>
        {rejectState?.error ? <p className="text-sm text-certified-danger">{rejectState.error}</p> : null}
      </form>
    </div>
  );
}
