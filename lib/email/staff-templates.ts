// Staff account lifecycle emails (docs/build-phases.md Phase 2.75). Sent
// through lib/email/send.ts, which mocks to console outside production per
// CLAUDE.md's free-tier discipline — so a temporary password never actually
// leaves this machine during routine local testing.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  account_manager: 'Account Manager',
  finance: 'Finance',
};

export function staffInviteEmail(name: string, role: string, tempPassword: string, appUrl: string) {
  const roleLabel = ROLE_LABEL[role] ?? role;
  return {
    subject: `You've been added to the Certified Africa staff console`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>You've been added to the Certified Africa staff console as <strong>${roleLabel}</strong>.</p>
<p>Sign in at <a href="${appUrl}/staff/login">${appUrl}/staff/login</a> with this temporary password:</p>
<p><code>${escapeHtml(tempPassword)}</code></p>
<p>You'll be asked to set up an authenticator app (TOTP) on first sign-in — this is mandatory for all staff accounts. We'd also recommend changing this temporary password via "Forgot password" once you're in.</p>`,
  };
}

export function staffSuspendedEmail(name: string) {
  return {
    subject: `Your Certified Africa staff access has been suspended`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your access to the Certified Africa staff console has been suspended. Contact an Admin if you believe this is a mistake.</p>`,
  };
}

export function staffReinstatedEmail(name: string) {
  return {
    subject: `Your Certified Africa staff access has been reinstated`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your access to the Certified Africa staff console has been reinstated. You can sign in as before.</p>`,
  };
}
