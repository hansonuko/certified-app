// Placeholder issuer dashboard — the real dashboard (brand setup, templates,
// stats) is Phase 3 (docs/build-phases.md). This exists so Phase 0 has
// something to prove the guard works end to end.
export default function DashboardHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Dashboard</h1>
      <p className="text-certified-muted">Signed in as an issuer. Full dashboard ships in later phases.</p>
    </main>
  );
}
