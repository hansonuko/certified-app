import { requireStaffSession } from '@/lib/auth/staff';

// Placeholder staff console landing page — the real console (team
// management, audit log, application review, etc.) is later phases
// (docs/build-phases.md). This exists so Phase 0 has something to prove the
// guard works end to end.
export default async function StaffHomePage() {
  const { role } = await requireStaffSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Staff console</h1>
      <p className="text-certified-muted">Signed in as {role}. Full console ships in later phases.</p>
    </main>
  );
}
