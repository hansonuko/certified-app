'use client';

import { useActionState, useState } from 'react';
import { createOrganizationManually, type ManualOrgState } from './actions';

const inputClass = 'rounded-control border border-certified-border px-3 py-2 text-sm';
const labelClass = 'flex flex-col gap-1 text-sm text-certified-ink';

export function ManualOrgForm() {
  const [state, action, pending] = useActionState<ManualOrgState, FormData>(createOrganizationManually, null);
  const [verifiedOutOfBand, setVerifiedOutOfBand] = useState(false);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">Organization</h2>
        <label className={labelClass}>
          Legal name
          <input type="text" name="legal_name" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Display name (public)
          <input type="text" name="display_name" required className={inputClass} />
        </label>
        <label className={labelClass}>
          RC/CAC number (optional)
          <input type="text" name="rc_number" className={inputClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Street
            <input type="text" name="address_street" className={inputClass} />
          </label>
          <label className={labelClass}>
            Country
            <input type="text" name="address_country" className={inputClass} />
          </label>
          <label className={labelClass}>
            Region/State
            <input type="text" name="address_region" className={inputClass} />
          </label>
          <label className={labelClass}>
            Locality/LGA
            <input type="text" name="address_locality" className={inputClass} />
          </label>
        </div>
        <label className={labelClass}>
          Expected trainee volume
          <select name="trainee_volume_band" required className={inputClass} defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            <option value="0-5">0-5</option>
            <option value="6-15">6-15</option>
            <option value="16-29">16-29</option>
            <option value="30+">30+</option>
          </select>
        </label>
        <label className={labelClass}>
          Field(s) of training
          <input type="text" name="training_fields" className={inputClass} />
        </label>
        <label className={labelClass}>
          Short public description
          <textarea name="training_description" rows={3} className={inputClass} />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-certified-navy">Owner contact</h2>
        <p className="text-xs text-certified-muted">
          A Certified Africa account is created for this email with a temporary password — they&apos;ll use it to
          sign in and set up their brand.
        </p>
        <label className={labelClass}>
          Full name
          <input type="text" name="owner_full_name" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Phone
          <input type="tel" name="owner_phone" required className={inputClass} />
        </label>
        <label className={labelClass}>
          Email
          <input type="email" name="owner_email" required className={inputClass} />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-certified-border p-4">
        <h2 className="font-display text-lg text-certified-navy">Identity verification</h2>
        <label className="flex items-center gap-2 text-sm text-certified-ink">
          <input
            type="checkbox"
            name="verified_out_of_band"
            checked={verifiedOutOfBand}
            onChange={(e) => setVerifiedOutOfBand(e.target.checked)}
          />
          Verified out-of-band (skip document upload)
        </label>

        {verifiedOutOfBand ? (
          <label className={labelClass}>
            Verification note (required)
            <textarea
              name="verification_note"
              rows={2}
              required
              placeholder="How was this business's identity verified?"
              className={inputClass}
            />
          </label>
        ) : (
          <>
            <label className={labelClass}>
              Identification document
              <input type="file" name="identification_document" accept="image/jpeg,image/png,image/webp,application/pdf" className={inputClass} />
            </label>
            <label className={labelClass}>
              Business registration certificate (e.g. CAC)
              <input type="file" name="proof_of_operation" accept="image/jpeg,image/png,image/webp,application/pdf" className={inputClass} />
            </label>
          </>
        )}
      </section>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Creating…' : 'Create & approve organization'}
      </button>
      {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}
    </form>
  );
}
