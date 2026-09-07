'use client';

import { useActionState } from 'react';
import { updateProfile, type ProfileFormState } from './actions';

type TraineeDefaults = {
  bio: string | null;
  photo_url: string | null;
  contact_visibility: string;
  open_to_hire: boolean;
};

export function ProfileForm({ id, trainee }: { id: string; trainee: TraineeDefaults }) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(updateProfile.bind(null, id), null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {trainee.photo_url ? (
        <img src={trainee.photo_url} alt="Current profile photo" className="h-24 w-24 rounded-full object-cover" />
      ) : null}
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Photo
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="rounded-control border border-certified-border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Bio
        <textarea
          name="bio"
          rows={4}
          defaultValue={trainee.bio ?? ''}
          className="rounded-control border border-certified-border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Contact visibility
        <select
          name="contact_visibility"
          defaultValue={trainee.contact_visibility}
          className="rounded-control border border-certified-border px-3 py-2"
        >
          <option value="public">Public</option>
          <option value="gated">Gated (contact relay only)</option>
          <option value="hidden">Hidden (no contact form shown)</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-certified-ink">
        <input type="checkbox" name="open_to_hire" defaultChecked={trainee.open_to_hire} />
        Open to hire
      </label>
      {state && 'error' in state ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
      {state && 'success' in state ? <p className="text-sm text-certified-success">Profile updated.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
