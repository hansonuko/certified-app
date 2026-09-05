// Placeholder shell — the real marketing homepage is a later phase
// (docs/build-phases.md). This page exists so Phase 0 has something to build
// and run against.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-display text-3xl text-certified-navy">Certified</h1>
      <p className="text-certified-muted">Foundation phase — application code starts here.</p>
    </main>
  );
}
