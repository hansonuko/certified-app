function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function organizationSuspendedEmail(orgName: string, reason: string) {
  return {
    subject: `${orgName} has been suspended on Certified Africa`,
    html: `<p><strong>${orgName}</strong> has been suspended on Certified Africa:</p>
<blockquote>${escapeHtml(reason)}</blockquote>
<p>Certificate issuance is paused until this is resolved. Contact support if you have questions.</p>`,
  };
}

export function organizationReinstatedEmail(orgName: string) {
  return {
    subject: `${orgName} has been reinstated on Certified Africa`,
    html: `<p>Good news — <strong>${orgName}</strong> has been reinstated on Certified Africa. Certificate issuance is available again.</p>`,
  };
}

// Manual-entry path (app/staff/(console)/organizations/new) — a staff
// member added and approved this org directly, so unlike the applicant-
// submitted flow there's no "your application was approved" moment; this
// email doubles as both the welcome and the account-access email, same
// temp-password shape as lib/email/staff-templates.ts's staffInviteEmail.
export function organizationManuallyAddedEmail(ownerName: string, orgName: string, tempPassword: string, appUrl: string) {
  return {
    subject: `${orgName} is now on Certified Africa`,
    html: `<p>Hi ${escapeHtml(ownerName)},</p>
<p><strong>${escapeHtml(orgName)}</strong> has been added to Certified Africa and is approved to issue certificates.</p>
<p>Sign in at <a href="${appUrl}/login">${appUrl}/login</a> with this temporary password to set up your brand and start issuing:</p>
<p><code>${escapeHtml(tempPassword)}</code></p>
<p>We'd recommend changing this temporary password via "Forgot password" once you're in.</p>`,
  };
}
