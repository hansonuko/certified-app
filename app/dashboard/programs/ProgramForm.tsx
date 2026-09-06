'use client';

import { useActionState } from 'react';
import { createProgram, updateProgram, type ProgramFormState } from './actions';

type Initial = {
  title: string;
  description: string;
  category: string;
  duration: string;
  startDate: string;
  endDate: string;
  certificateValidityMonths: string;
};

const EMPTY: Initial = {
  title: '',
  description: '',
  category: '',
  duration: '',
  startDate: '',
  endDate: '',
  certificateValidityMonths: '',
};

export function ProgramForm({
  mode,
  programId,
  initial = EMPTY,
}: {
  mode: 'create' | 'edit';
  programId?: string;
  initial?: Initial;
}) {
  const action = mode === 'create' ? createProgram : updateProgram.bind(null, programId!);
  const [state, formAction, pending] = useActionState<ProgramFormState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Title" name="title" defaultValue={initial.title} />
      <TextAreaField label="Description" name="description" defaultValue={initial.description} />
      <div className="flex gap-4">
        <Field label="Category / field" name="category" defaultValue={initial.category} />
        <Field label="Duration (e.g. 6 weeks)" name="duration" defaultValue={initial.duration} />
      </div>
      <div className="flex gap-4">
        <Field label="Start date" name="start_date" type="date" defaultValue={initial.startDate} />
        <Field label="End date" name="end_date" type="date" defaultValue={initial.endDate} />
      </div>
      <Field
        label="Certificates expire after (months) — leave blank for no expiry"
        name="certificate_validity_months"
        type="number"
        defaultValue={initial.certificateValidityMonths}
      />
      <p className="text-xs text-certified-muted">
        Off by default (docs/blueprint.md §11.5) — only set this for programs like safety recertification where a
        completion certificate shouldn&apos;t stay valid forever.
      </p>

      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : mode === 'create' ? 'Create program' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="rounded-control border border-certified-border px-3 py-2"
      />
    </label>
  );
}

function TextAreaField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-certified-ink">
      {label}
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        className="rounded-control border border-certified-border px-3 py-2"
      />
    </label>
  );
}
