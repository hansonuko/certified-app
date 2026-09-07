'use client';

import { useActionState, useEffect } from 'react';
import 'altcha';
import { submitPlatformContactRequest, type ContactFormState } from '@/lib/contact/actions';

const TOPICS = ['General', 'Issuer support', 'Press', 'Partnership', 'Something else'];

const INPUT_CLASS =
  'rounded-control border border-certified-border bg-certified-surface px-3 py-2 text-certified-ink dark:bg-white/[0.04] dark:backdrop-blur-sm dark:placeholder:text-white/30';

// The general /contact page's form — distinct from components/ContactForm.tsx,
// which relays to a specific trainee/organization rather than the platform
// itself. See lib/contact/actions.ts's submitPlatformContactRequest.
export function PlatformContactForm() {
  const [state, formAction, pending] = useActionState<ContactFormState, FormData>(submitPlatformContactRequest, null);

  useEffect(() => {
    if (state && 'error' in state) {
      document.querySelectorAll('altcha-widget').forEach((el) => (el as HTMLElement & { reset?: () => void }).reset?.());
    }
  }, [state]);

  if (state && 'success' in state) {
    return (
      <div className="rounded-card border border-certified-border bg-certified-surface-2 p-6 text-center dark:bg-white/[0.04] dark:backdrop-blur-xl">
        <p className="font-semibold text-certified-success">Message sent, thanks for reaching out.</p>
        <p className="mt-1 text-sm text-certified-muted">We reply by email, usually within a couple of business days.</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-card border border-certified-border bg-certified-surface p-6 dark:bg-white/[0.04] dark:backdrop-blur-xl"
    >
      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Topic
        <select name="topic" defaultValue="General" className={INPUT_CLASS}>
          {TOPICS.map((t) => (
            <option key={t} value={t} className="bg-certified-surface text-certified-ink">
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Your name
        <input name="sender_name" required className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Your email
        <input name="sender_email" type="email" required className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1 text-sm text-certified-ink">
        Message
        <textarea name="message" rows={5} required className={INPUT_CLASS} />
      </label>

      {/* @ts-expect-error -- altcha-widget is a custom element, not a typed JSX intrinsic */}
      <altcha-widget challenge="/api/altcha-challenge" />

      {state && 'error' in state ? <p className="text-sm text-certified-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-control bg-certified-navy px-5 py-3 text-sm font-medium text-white transition hover:brightness-110 active:scale-[0.97] disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500"
      >
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
