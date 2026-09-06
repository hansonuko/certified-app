function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function organizationSuspendedEmail(orgName: string, reason: string) {
  return {
    subject: `${orgName} has been suspended on Certified`,
    html: `<p><strong>${orgName}</strong> has been suspended on Certified:</p>
<blockquote>${escapeHtml(reason)}</blockquote>
<p>Certificate issuance is paused until this is resolved. Contact support if you have questions.</p>`,
  };
}

export function organizationReinstatedEmail(orgName: string) {
  return {
    subject: `${orgName} has been reinstated on Certified`,
    html: `<p>Good news — <strong>${orgName}</strong> has been reinstated on Certified. Certificate issuance is available again.</p>`,
  };
}
