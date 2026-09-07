// Shared bits for /terms and /privacy. No @tailwindcss/typography plugin is
// installed (tailwind.config.ts's plugins array is empty), so headings/
// lists/links are styled by hand here rather than via a "prose" class.

export function LegalDraftNotice() {
  return (
    <div className="max-w-3xl rounded-card border border-dashed border-certified-border bg-certified-surface-2 p-4 text-sm text-certified-muted">
      This is drafted as a strong starting point, the same way{' '}
      <code>docs/declaration-form.md</code> was — it has not been reviewed by a lawyer yet. Treat it as a real policy
      in effect today, not placeholder text, but one that should still get a proper legal review (ideally from
      someone familiar with data-protection law across the countries Certified Africa actually operates in) before
      it's relied on for anything high-stakes.
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl text-certified-navy">{title}</h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-certified-ink [&_a]:text-certified-navy [&_a]:underline [&_li]:mt-1 [&_strong]:text-certified-ink [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2">
        {children}
      </div>
    </section>
  );
}
