// Shared "coming soon" placeholder (docs/build-phases.md Phase 3: every
// dashboard nav item is a real route from day one, even where the feature
// ships in a later phase, rather than a 404).
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <main className="flex flex-col gap-2 p-8">
      <h1 className="font-display text-2xl text-certified-navy">{title}</h1>
      <p className="text-certified-muted">Coming soon — ships in {phase}.</p>
    </main>
  );
}
