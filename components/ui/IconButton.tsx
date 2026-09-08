'use client';

/**
 * Shared icon-button (docs/design-system.md §7's icon-button row: "muted
 * icon, no visible bounds" default; circular background tint fades in on
 * hover; scale 0.92 on press; gold focus-visible, circular; 40% opacity
 * disabled"). First real call site: the responsive dashboard-shell
 * hamburger/close controls (components/StaffShell.tsx,
 * components/IssuerShell.tsx, docs/design-system.md §8) — a plain
 * `<button>` since it triggers client-side drawer state, not navigation.
 */
export function IconButton({
  onClick,
  label,
  children,
  className = '',
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-current transition-[background-color,transform] duration-150 ease-out hover:bg-black/5 active:scale-[0.92] disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
