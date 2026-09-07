import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { CERTIFICATE_TEMPLATES } from '@/lib/certificates/templates';

const INTEGRATIONS: Array<{ label: string; envVars: string[] }> = [
  { label: 'Resend (transactional email)', envVars: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'] },
  { label: 'Upstash Redis (rate limiting)', envVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] },
  { label: 'Altcha (bot protection)', envVars: ['ALTCHA_HMAC_SECRET'] },
  { label: 'Certificate signing', envVars: ['CERTIFICATE_SIGNING_SECRET'] },
  { label: 'Bulk-issuance Cron auth', envVars: ['CRON_SECRET'] },
];

// /staff/settings (docs/build-phases.md Phase 2.75, Admin only). A shell for
// system configuration — "full config UI can be minimal in v1 (read display
// + a few editable fields), it just needs to exist and be properly gated"
// per the phase's own prompt. Everything here is read-only for now: the
// rate-limit thresholds and template registry are source-level constants,
// not DB-backed settings, so there's nothing to persist an edit to yet
// without a schema change that isn't otherwise in scope this phase.
// Integration checks only report presence/absence of an env var — never the
// value itself (CLAUDE.md rule #3's "never logged" spirit extends to never
// displayed, too).
export default async function SettingsPage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'manage_system_settings')) redirect('/staff');

  return (
    <main className="flex flex-col gap-8 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Settings</h1>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Certificate templates</h2>
        <p className="text-sm text-certified-muted">
          {Object.keys(CERTIFICATE_TEMPLATES).length} templates registered in{' '}
          <code>lib/certificates/templates/index.ts</code>.
        </p>
        <ul className="flex flex-wrap gap-2">
          {Object.keys(CERTIFICATE_TEMPLATES).map((id) => (
            <li key={id} className="rounded-full bg-certified-surface-2 px-3 py-1 text-xs text-certified-navy">
              {id}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Rate-limit thresholds</h2>
        <table className="w-full max-w-lg text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Endpoint</th>
              <th className="py-2">Threshold</th>
              <th className="py-2">Backing store</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-certified-border">
              <td className="py-2">/verify/[public_id]</td>
              <td className="py-2">10 lookups / min / IP</td>
              <td className="py-2 text-certified-muted">
                {process.env.UPSTASH_REDIS_REST_URL ? 'Upstash' : 'In-memory (Upstash not configured)'}
              </td>
            </tr>
            <tr className="border-b border-certified-border">
              <td className="py-2">Contact / hire relay</td>
              <td className="py-2">5 messages / hour / IP</td>
              <td className="py-2 text-certified-muted">
                {process.env.UPSTASH_REDIS_REST_URL ? 'Upstash' : 'In-memory (Upstash not configured)'}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Integration status</h2>
        <table className="w-full max-w-lg text-left text-sm">
          <thead>
            <tr className="border-b border-certified-border text-certified-muted">
              <th className="py-2">Integration</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {INTEGRATIONS.map(({ label, envVars }) => {
              const configured = envVars.every((v) => !!process.env[v]);
              return (
                <tr key={label} className="border-b border-certified-border">
                  <td className="py-2">{label}</td>
                  <td className={`py-2 ${configured ? 'text-certified-success' : 'text-certified-warning'}`}>
                    {configured ? 'Configured' : 'Not configured'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
