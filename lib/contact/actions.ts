'use server';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyAltchaSolution } from '@/lib/altcha/server';
import { getContactRateLimiter } from '@/lib/rate-limit/contact-limiter';
import { contactRelayEmail, platformContactEmail } from '@/lib/email/contact-templates';
import { sendEmail } from '@/lib/email/send';

export type ContactFormState = { error: string } | { success: true } | null;

/**
 * The general "/contact" marketing page (docs/sitemap.md §1) — distinct
 * from submitContactRequest below (which relays to a specific trainee/org).
 * Reuses the same rate limiter/Altcha/email plumbing since it's protecting
 * against the same kind of abuse, just with a fixed platform recipient
 * instead of a per-target one — see platformContactEmail's own comment for
 * why this goes straight to an inbox rather than a staff queue table.
 */
export async function submitPlatformContactRequest(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const topic = (formData.get('topic') as string | null)?.trim() || 'General';
  const senderName = (formData.get('sender_name') as string | null)?.trim();
  const senderEmail = (formData.get('sender_email') as string | null)?.trim();
  const message = (formData.get('message') as string | null)?.trim();

  if (!senderName || !senderEmail || !message) {
    return { error: 'Name, email, and a message are all required.' };
  }

  const altchaOk = await verifyAltchaSolution(formData.get('altcha') as string | null);
  if (!altchaOk) {
    return { error: 'Bot-protection check failed — please try again.' };
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
  const rateLimit = await getContactRateLimiter().limit(`platform:${ip}`);
  if (!rateLimit.success) {
    return {
      error: `Too many messages sent from this location. Try again in about ${Math.ceil(rateLimit.resetMs / 60_000)} minute(s).`,
    };
  }

  const supportInbox = process.env.SUPPORT_INBOX_EMAIL || 'support@certifiedafrica.app';
  const template = platformContactEmail({ topic, senderName, senderEmail, message });
  try {
    await sendEmail({ to: supportInbox, replyTo: senderEmail, ...template });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not send your message. Please try again later.' };
  }

  return { success: true };
}

/**
 * The reveal-or-relay contact action (docs/blueprint.md §6, Phase 6) —
 * shared by both the trainee (app/directory/trainee/[id]) and issuer
 * (app/directory/org/[slug]) public pages via components/ContactForm.tsx,
 * branching on `target_type`. Default relay, not reveal: the sender's
 * message reaches the trainee/issuer's real email with the sender's own
 * contact info in the body and as replyTo (lib/email/contact-templates.ts)
 * — the target's phone/email is read server-side only, via the
 * service-role client (neither is anon-selectable through any public view,
 * CLAUDE.md rule #5) and is never sent back to the browser in this
 * response or any other.
 *
 * No message content is persisted — this is a pure relay, not an inbox.
 * The in-memory rate limiter (lib/rate-limit/contact-limiter.ts) is the
 * only state this keeps, same "mock until Upstash is configured" shape as
 * lib/rate-limit/verify-limiter.ts.
 */
export async function submitContactRequest(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const targetType = formData.get('target_type');
  const targetId = formData.get('target_id') as string | null;
  const senderName = (formData.get('sender_name') as string | null)?.trim();
  const senderEmail = (formData.get('sender_email') as string | null)?.trim();
  const senderPhone = (formData.get('sender_phone') as string | null)?.trim() || null;
  const message = (formData.get('message') as string | null)?.trim();

  if (targetType !== 'trainee' && targetType !== 'organization') {
    return { error: 'Invalid contact target.' };
  }
  if (!targetId) return { error: 'Missing contact target.' };
  if (!senderName || !senderEmail || !message) {
    return { error: 'Name, email, and a message are all required.' };
  }

  const altchaOk = await verifyAltchaSolution(formData.get('altcha') as string | null);
  if (!altchaOk) {
    return { error: 'Bot-protection check failed — please try again.' };
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown';
  const rateLimit = await getContactRateLimiter().limit(ip);
  if (!rateLimit.success) {
    return {
      error: `Too many messages sent from this location. Try again in about ${Math.ceil(rateLimit.resetMs / 60_000)} minute(s).`,
    };
  }

  const admin = createAdminClient();
  let recipientEmail: string | null;
  let recipientName: string;

  if (targetType === 'trainee') {
    const { data: trainee } = await admin
      .from('trainees')
      .select('full_name, email, contact_visibility, is_hidden')
      .eq('id', targetId)
      .maybeSingle();

    // 'hidden' suppresses contact entirely; 'public' and 'gated' both relay
    // — raw contact info is never directly exposed either way under the
    // confirmed "no public opt-out" decision (docs/blueprint.md §11 item 2),
    // so there's no functional difference between those two states here.
    if (!trainee || trainee.is_hidden || trainee.contact_visibility === 'hidden' || !trainee.email) {
      return { error: 'This profile is not accepting messages right now.' };
    }
    recipientEmail = trainee.email;
    recipientName = trainee.full_name;
  } else {
    const { data: org } = await admin
      .from('organizations')
      .select('display_name, owner_email, status')
      .eq('id', targetId)
      .maybeSingle();

    if (!org || org.status !== 'approved' || !org.owner_email) {
      return { error: 'This organization is not accepting messages right now.' };
    }
    recipientEmail = org.owner_email;
    recipientName = org.display_name;
  }

  if (!recipientEmail) {
    // Unreachable given the two branches above always either return early
    // or assign a string — this satisfies the type checker without a
    // non-null assertion, and is a harmless no-op guard either way.
    return { error: 'This profile is not accepting messages right now.' };
  }

  const template = contactRelayEmail({ recipientName, senderName, senderEmail, senderPhone, message });
  try {
    await sendEmail({ to: recipientEmail, replyTo: senderEmail, ...template });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not send your message. Please try again later.' };
  }

  return { success: true };
}
