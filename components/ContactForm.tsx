'use client';

import { useActionState, useEffect } from 'react';
import 'altcha';
import { submitContactRequest, type ContactFormState } from '@/lib/contact/actions';

/**
 * Shared contact/hire relay form (docs/blueprint.md §6) — used by both the
 * trainee and issuer public pages. `targetType`/`targetId` tell the server
 * action (lib/contact/actions.ts) who the message is actually for; the
 * component itself never knows or needs the recipient's real contact info.
 */
export function ContactForm({
  targetType,
  targetId,
  recipientLabel,
}: {
  targetType: 'trainee' | 'organization';
  targetId: string;
  recipientLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(submitContactRequest, null);

  useEffect(() => {
    if (state && 'error' in state) {
      document.querySelectorAll('altcha-widget').forEach((el) => (el as HTMLElement & { reset?: () => void }).reset?.());
    }
  }, [state]);

  if (state && 'success' in state) {
    return (
      <div className="rounded-card border border-certified-border bg-certified-surface-2 p-4 text-center">
        <p className="text-sm font-semibold text-certified-success">Message sent to {recipientLabel}.</p>
        <p className="text-xs text-certified-muted">They received your contact details and can reply directly.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-card border border-certified-border bg-certified-surface-2 p-4">
      <p className="text-sm font-semibold text-certified-ink">Contact {recipientLabel}</p>
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />

      <Field label="Your name" name="sender_name" required />
      <Field label="Your email" name="sender_email" type="email" required />
      <Field label="Your phone (optional)" name="sender_phone" type="tel" />
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Message
        <textarea name="message" rows={4} required className="rounded-control border border-certified-border px-3 py-2" />
      </label>

      {/* @ts-expect-error -- altcha-widget is a custom element, not a typed JSX intrinsic */}
      <altcha-widget challenge="/api/altcha-challenge" />

      {state && 'error' in state ? <p className="text-sm text-certified-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send message'}
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
    <label className="flex flex-col gap-1 text-sm text-certified-ink">
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
