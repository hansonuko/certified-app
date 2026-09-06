// docs/sitemap.md §5: "'You're on the Free plan' placeholder; real billing
// UI ships with monetization" — deliberately different wording from the
// generic ComingSoon placeholder, per that spec.
export default function BillingPage() {
  return (
    <main className="flex flex-col gap-2 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Billing</h1>
      <p className="text-certified-muted">You&apos;re on the Free plan.</p>
    </main>
  );
}
