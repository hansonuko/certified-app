import Link from 'next/link';

/**
 * Switches between the two public directory surfaces — trainees
 * (app/directory/page.tsx) and organizations/issuers
 * (app/directory/organizations/page.tsx). Before this, there was no way to
 * search or browse approved organizations at all: /directory only ever
 * searched trainees, and an issuer's own public page (/directory/org/
 * [slug]) was only reachable by clicking through a trainee's card.
 */
export function DirectoryTabs({ active }: { active: 'trainees' | 'organizations' }) {
  const tabs = [
    { key: 'trainees' as const, href: '/directory', label: 'Find a trainee' },
    { key: 'organizations' as const, href: '/directory/organizations', label: 'Find an issuer' },
  ];

  return (
    <div className="flex gap-2 border-b border-certified-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === active
              ? 'border-b-2 border-certified-gold px-3 py-2 text-sm font-semibold text-certified-navy'
              : 'border-b-2 border-transparent px-3 py-2 text-sm text-certified-muted transition hover:text-certified-navy'
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
