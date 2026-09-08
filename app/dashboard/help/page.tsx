import Link from 'next/link';

// /dashboard/help (docs/sitemap.md §5: "Contact Certified Africa, FAQ
// links"). No new backend needed — /contact and /faq already exist on the
// public marketing site (out-of-band PR #22); this just points an
// approved issuer at them from inside the dashboard shell instead of
// making them navigate out to the public site to find them.
export default function HelpPage() {
  return (
    <main className="flex flex-col gap-4 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Help</h1>
      <div className="flex flex-col gap-2">
        <Link href="/contact" className="text-certified-navy underline">
          Contact Certified Africa support →
        </Link>
        <Link href="/faq" className="text-certified-navy underline">
          Frequently asked questions →
        </Link>
      </div>
    </main>
  );
}
