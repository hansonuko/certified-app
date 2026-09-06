'use client';

import { useActionState } from 'react';
import { issueCertificate, type IssueFormState } from './actions';
import { LocationFields } from '@/components/LocationFields';

export function IssueForm({ programId }: { programId: string }) {
  const [state, formAction, pending] = useActionState<IssueFormState, FormData>(issueCertificate, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="program_id" value={programId} />

      <Field label="Full name" name="full_name" required />

      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Photo (optional)
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="rounded-control border border-certified-border px-3 py-2"
        />
      </label>

      <div className="flex gap-4">
        <Field label="Phone (optional)" name="phone" type="tel" />
        <Field label="Email (optional)" name="email" type="email" />
      </div>

      <TextAreaField label="Short bio for the public directory (optional)" name="bio" />

      <LocationFields countryName="country" regionName="region" localityName="locality" />

      <div className="flex gap-4">
        <Field label="Completion date" name="completion_date" type="date" required />
        <Field label="Grade / distinction (optional)" name="grade" />
      </div>

      <label className="flex items-start gap-2 text-sm text-certified-ink">
        <input type="checkbox" name="consent" className="mt-1" required />
        I confirm this trainee has consented to a public profile.
      </label>

      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Issuing certificate…' : 'Issue certificate'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-sm text-certified-ink">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-control border border-certified-border px-3 py-2"
      />
    </label>
  );
}

function TextAreaField({ label, name }: { label: string; name: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-certified-ink">
      {label}
      <textarea name={name} rows={3} className="rounded-control border border-certified-border px-3 py-2" />
    </label>
  );
}
