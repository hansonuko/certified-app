/**
 * Shared interactive-card treatment (docs/design-system.md §7's card row:
 * "flat, hairline border" default; hover scale 1.0→1.015 + shadow lift +
 * border strengthens; active settles to scale 1.005; gold focus-visible
 * around the whole card"). Light-mode only — unlike components/marketing/
 * shared.tsx's Card, nothing outside the marketing site has dark-mode
 * styling yet, and adding it here would be a separate decision, not part
 * of this pass.
 *
 * Exported as a plain className string rather than a wrapping component:
 * the one call site so far (app/directory/page.tsx's TraineeDirectoryCard)
 * needs the *whole card* to be a single `<Link>` for both mouse and
 * keyboard activation, and a wrapping `<div>` would either duplicate the
 * interactive surface or force the Link inside it, breaking the "click
 * anywhere on the card" behavior. A className constant applies identically
 * to a Link, a div, or a button — whatever the call site's semantics need.
 */
// docs/design-system.md §1 doesn't define a distinct "border-strong" token
// — hover:border-certified-gold matches the convention this codebase
// already used for the same purpose (app/directory/page.tsx's original
// hover:border-certified-gold, predating this shared constant).
export const INTERACTIVE_CARD_CLASSNAME =
  'rounded-card border border-certified-border bg-certified-surface transition-[transform,box-shadow,border-color] duration-150 ease-out hover:scale-[1.015] hover:border-certified-gold hover:shadow-md active:scale-[1.005]';
