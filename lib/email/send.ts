/**
 * Application-decision emails (docs/build-phases.md Phase 2). Per CLAUDE.md's
 * free-tier discipline ("build and iterate against local/mock
 * implementations... a console-logging 'email sender' in dev mode"), this
 * only actually calls Resend when NODE_ENV is 'production' — every local
 * dev send (including repeated manual testing of the approve/reject flow)
 * logs to the console instead, so a real Resend key sitting in .env.local
 * never gets exercised by routine iteration. There's no separate "staging"
 * concept yet (nothing is deployed), so this is the whole gate for now.
 */
import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not set.');
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  /** Phase 6's contact relay (docs/blueprint.md §6) sets this to the inquirer's own
   * email, so the recipient can hit "Reply" and reach them directly without Certified
   * Africa ever exposing either party's contact info to the other side upfront. */
  replyTo?: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[email:mock] to=${to} subject="${subject}"${replyTo ? ` replyTo=${replyTo}` : ''}\n${html}`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error('RESEND_FROM_EMAIL is not set.');

  const { error } = await getResendClient().emails.send({ from, to, subject, html, ...(replyTo ? { replyTo } : {}) });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
