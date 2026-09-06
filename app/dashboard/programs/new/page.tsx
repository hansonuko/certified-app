import { ProgramForm } from '../ProgramForm';

// /dashboard/programs/new (docs/build-phases.md Phase 4).
export default function NewProgramPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="font-display text-2xl text-certified-navy">New program</h1>
      <ProgramForm mode="create" />
    </main>
  );
}
