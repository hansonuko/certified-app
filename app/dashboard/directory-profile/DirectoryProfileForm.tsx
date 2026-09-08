'use client';

import { useActionState } from 'react';
import { updateDirectoryProfile, type DirectoryProfileState } from './actions';

export function DirectoryProfileForm({ bio, trainingFields }: { bio: string | null; trainingFields: string | null }) {
  const [state, action, pending] = useActionState<DirectoryProfileState, FormData>(updateDirectoryProfile, null);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4 rounded-card border border-certified-border p-6">
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Bio
        <textarea
          name="bio"
          rows={4}
          defaultValue={bio ?? ''}
          placeholder="A short description shown on your public directory page."
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Field(s) of training
        <input
          type="text"
          name="training_fields"
          defaultValue={trainingFields ?? ''}
          placeholder="e.g. Welding, Fashion Design"
          className="rounded-control border border-certified-border px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
    </form>
  );
}
