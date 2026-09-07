// Shared bits for /terms and /privacy. No @tailwindcss/typography plugin is
// installed (tailwind.config.ts's plugins array is empty), so headings/
// lists/links are styled by hand here rather than via a "prose" class.

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
