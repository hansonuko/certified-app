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
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[email:mock] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error('RESEND_FROM_EMAIL is not set.');

  const { error } = await getResendClient().emails.send({ from, to, subject, html });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
