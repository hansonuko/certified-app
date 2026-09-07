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

/**
 * The general "/contact" marketing-page form (docs/sitemap.md §1: "routes
 * to Account Manager queue"). There's no `staff/support` inbox table yet
 * (docs/sitemap.md §7 lists `/staff/support` as its own future page, still
 * unbuilt) — until that exists, this sends straight to SUPPORT_INBOX_EMAIL
 * with the sender set as replyTo, same relay shape as contactRelayEmail
 * above, just with a fixed platform recipient instead of a trainee/org one.
 */
export function platformContactEmail({
  topic,
  senderName,
  senderEmail,
  message,
}: {
  topic: string;
  senderName: string;
  senderEmail: string;
  message: string;
}) {
  return {
    subject: `[Contact form] ${topic}, ${senderName}`,
    html: `<p>New message from the Certified Africa contact form.</p>
<p><strong>Topic:</strong> ${escapeHtml(topic)}</p>
<p><strong>From:</strong> ${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</p>
<blockquote>${escapeHtml(message).replace(/\n/g, '<br>')}</blockquote>
<p>Reply to this email to respond directly.</p>`,
  };
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
<p>Just hit reply on this email to respond, it'll go straight to them.</p>`,
  };
}
