import { CLAIM_TOKEN_TTL_DAYS } from '@/lib/trainees/claim-token';

/**
 * Trainee self-claim link email (docs/build-phases.md Phase 8). Fired from
 * both trainee-creation call sites — the single-entry issuance action
 * (app/dashboard/programs/[id]/issue/actions.ts) and the bulk processor
 * (lib/bulk-issuance/processor.ts) — only when the new trainee row has an
 * email address; many bulk-issuance rows won't. The link carries a bare
 * opaque token (lib/trainees/claim-token.ts); app/claim/[token] does the
 * actual verification, this template never asserts the link is valid.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function claimProfileEmail({
  traineeName,
  orgName,
  claimUrl,
}: {
  traineeName: string;
  orgName: string;
  claimUrl: string;
}) {
  return {
    subject: 'Claim your Certified Africa profile',
    html: `<p>Hi ${escapeHtml(traineeName)},</p>
<p><strong>${escapeHtml(orgName)}</strong> issued you a certificate on Certified Africa. Claim your public profile to add a photo and bio, control who can contact you, and mark yourself open to hire:</p>
<p><a href="${claimUrl}">${claimUrl}</a></p>
<p>This link expires in ${CLAIM_TOKEN_TTL_DAYS} days. If you'd rather not have a public profile, you can safely ignore this email — your certificate stays valid and verifiable either way.</p>`,
  };
}
