import { requireStaffSession } from '@/lib/auth/staff';
import { createClient } from '@/lib/supabase/server';

// Role-aware overview (docs/build-phases.md Phase 2, docs/sitemap.md §6) —
// each role sees a different dashboard. Finance's version is a placeholder
// until Phase 9 (usage/cost dashboard); Admin and Account Manager get a
// real pending-applications count today since that's the one thing this
// phase actually builds.
export default async function StaffHomePage() {
  const { role, name } = await requireStaffSession();

  if (role === 'finance') {
    return (
      <main className="flex flex-col gap-4 p-8">
        <h1 className="font-display text-3xl text-certified-navy">Welcome, {name}</h1>
        <p className="text-certified-muted">
          Usage/cost dashboard ships in Phase 9 (docs/build-phases.md).
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Welcome, {name}</h1>
      <div className="rounded-card border border-certified-border bg-certified-surface p-6">
        <p className="text-3xl font-semibold text-certified-navy">{pendingCount ?? 0}</p>
        <p className="text-certified-muted">applications pending review</p>
      </div>
      {role === 'admin' ? (
        <p className="text-certified-muted">Operational analytics and staff management ship in later phases.</p>
      ) : null}
    </main>
  );
}
