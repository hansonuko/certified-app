/**
 * Contact/hire relay email (docs/blueprint.md §6, Phase 6). The recipient
 * (trainee or issuer) gets the sender's own contact info in the body and as
 * the email's replyTo — Certified Africa relays the introduction, it never
 * becomes a party continuing the conversation, and the sender's info is
 * never exposed anywhere except inside this one relayed email to the one
 * intended recipient.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function contactRelayEmail({
  recipientName,
  senderName,
  senderEmail,
  senderPhone,
  message,
}: {
  recipientName: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string | null;
  message: string;
}) {
  return {
    subject: `${senderName} sent you a message via Certified Africa`,
    html: `<p>Hi ${escapeHtml(recipientName)},</p>
<p><strong>${escapeHtml(senderName)}</strong> found your Certified Africa profile and sent you a message:</p>
<blockquote>${escapeHtml(message).replace(/\n/g, '<br>')}</blockquote>
<p>You can reach them directly:</p>
<ul>
  <li>Email: ${escapeHtml(senderEmail)}</li>
  ${senderPhone ? `<li>Phone: ${escapeHtml(senderPhone)}</li>` : ''}
</ul>
<p>Just hit reply on this email to respond — it'll go straight to them.</p>`,
  };
}
