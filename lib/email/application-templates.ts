// Plain, functional templates — matches the "basic flow" scope of this
// phase; on-brand HTML templates are a later polish pass, not required by
// docs/build-phases.md Phase 2.

export function applicationApprovedEmail(orgName: string) {
  return {
    subject: `${orgName} is approved on Certified`,
    html: `<p>Good news — <strong>${orgName}</strong> has been approved on Certified.</p>
<p>Sign in to set up your brand and start issuing certificates.</p>`,
  };
}

export function applicationMoreInfoEmail(orgName: string, reason: string) {
  return {
    subject: `Certified needs more information about ${orgName}`,
    html: `<p>We need a bit more information before we can approve <strong>${orgName}</strong>:</p>
<blockquote>${escapeHtml(reason)}</blockquote>
<p>Sign in and update your application to continue.</p>`,
  };
}

export function applicationRejectedEmail(orgName: string, reason: string) {
  return {
    subject: `Update on your Certified application for ${orgName}`,
    html: `<p>We're not able to approve <strong>${orgName}</strong> at this time:</p>
<blockquote>${escapeHtml(reason)}</blockquote>
<p>You're welcome to reapply immediately — there's no cooldown period.</p>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
