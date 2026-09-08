import { requireApprovedIssuerSession } from '@/lib/auth/issuer';
import { createClient } from '@/lib/supabase/server';
import { SecuritySettings } from './SecuritySettings';

// /dashboard/settings (docs/sitemap.md §5: "Profile, password, 2FA"). Owner
// contact fields are shown read-only, not editable here — they're KYC-
// reviewed at approval time (docs/blueprint.md §3.1), same reasoning
// app/dashboard/directory-profile/actions.ts already applies to display_
// name/slug; changing them without staff re-review isn't something this
// page should let happen quietly.
export default async function DashboardSettingsPage() {
  const { orgId } = await requireApprovedIssuerSession();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('owner_full_name, owner_email, owner_phone')
    .eq('id', orgId)
    .maybeSingle();

  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Settings</h1>

      <section className="flex max-w-sm flex-col gap-2 rounded-card border border-certified-border p-6 text-sm">
        <h2 className="font-display text-lg text-certified-navy">Profile</h2>
        <p className="text-certified-muted">
          Name: <span className="text-certified-ink">{org?.owner_full_name}</span>
        </p>
        <p className="text-certified-muted">
          Email: <span className="text-certified-ink">{org?.owner_email}</span>
        </p>
        <p className="text-certified-muted">
          Phone: <span className="text-certified-ink">{org?.owner_phone}</span>
        </p>
        <p className="text-xs text-certified-muted">
          Contact Certified Africa support to change these — they&apos;re reviewed at approval time.
        </p>
      </section>

      <SecuritySettings />
    </main>
  );
}
