# Certified Africa — Design System v1.0

Two design systems live in this product, and they must stay visually distinct:

1. **The Certified Africa platform UI** — the app itself (dashboards, directory, admin console, marketing pages). Modern, bold, motion-forward.
2. **The certificate templates** — what gets printed/PDF'd. Restrained and classy by design (the product is credibility, not decoration), but rendered in a bold-accent modern style per the confirmed direction.

---

## 1. Brand tokens (platform UI)

### Color

```
--certified-ink:        #0F172A   /* primary text, near-black navy */
--certified-navy:       #0F2340   /* primary brand — deep navy */
--certified-navy-2:     #1E3A5F   /* navy tint, gradients/accents */
--certified-gold:       #C9992E   /* signature accent — used sparingly */
--certified-gold-light: #E9C558
--certified-surface:    #FFFFFF
--certified-surface-2:  #F8F9FB   /* card/section backgrounds */
--certified-border:     #E2E5EA
--certified-muted:      #6B7280
--certified-success:    #15803D
--certified-danger:     #B91C1C
--certified-warning:    #B45309
```

Navy is the platform's dominant brand color; gold is reserved for the seal, verification badges, and small high-signal accents ("Verified" checkmarks, active-state highlights) — never used as a large fill, so it stays special.

### Typography

- **Display/serif** (certificate names, marketing headlines): `Georgia` / `"Playfair Display"` fallback stack — carries the "classy" register.
- **UI sans**: `Inter` (or system-ui fallback) for all app interface text — clean, highly legible at small sizes, wide language support.
- Scale: `12 / 14 / 16 / 20 / 24 / 32 / 40 / 56px`, line-height 1.5 for body, 1.15 for display.
- Weight: 400 regular, 500 medium for UI labels, 700 bold reserved for headlines and certificate trainee names only.

### Spacing & radius

- 4px base unit: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px`.
- Cards/panels: `12px` radius. Buttons/inputs: `8px`. Pills/badges: full radius.
- Generous whitespace on public-facing pages (verification, directory) — the product's credibility comes across partly through *not* looking crowded.

---

## 2. Motion system

Certified Africa should feel current — subtle, physics-based motion, never gratuitous.

| Interaction | Motion | Duration / easing |
|---|---|---|
| Page transition | Fade + 8px slide-up | 250ms, `ease-out` |
| Card hover (directory, dashboard) | Scale 1.0 → 1.015, shadow lift | 150ms, `ease-out` |
| Verification result reveal | Seal icon scales in with a soft spring, checkmark draws in (stroke-dashoffset animation) | 400ms spring (stiffness 220, damping 20) |
| Modal/drawer open | Slide + fade, backdrop fade | 200ms in / 150ms out |
| Button press | Scale 0.97 | 100ms |
| Skeleton loading | Shimmer sweep, not spinner, for content-shaped loads (directory cards, dashboard tables) | 1.2s loop |
| Form field error | Shake (±4px, 2 cycles) + red border fade-in | 300ms |
| Success toast (e.g. "Certificate issued") | Slide in from top-right, auto-dismiss with progress bar | 4s hold |

Implementation: **Framer Motion** in React. Every animation must respect `prefers-reduced-motion: reduce` — fall back to instant/opacity-only transitions, never disable functionality, only the flourish.

The verification-result reveal is the single most important animated moment in the product (it's the "aha, this is legit" instant) — worth the most polish: seal spring-scales in, QR-match confirmation checkmark draws itself, status badge (Valid/Revoked/Expired) fades in last with its role color.

---

## 3. Responsive rules

- Mobile-first. Breakpoints: `640 / 768 / 1024 / 1280px` (Tailwind defaults).
- Directory & verification pages must be excellent on mobile first — most real-world verification happens via a phone camera scanning a QR code at a physical location (an interview, a site inspection).
- Certificate PDF itself is a fixed print-oriented layout (A4 landscape) — not responsive, it's a document, not a webpage.
- Admin console can be desktop-optimized (agents work at a desk) but must remain usable at tablet width.
- Touch targets ≥ 44px on all interactive elements site-wide.

---

## 4. Certificate templates — "Bold-accent, modern" (confirmed direction, 10 templates)

All ten launch templates share the same underlying philosophy: **a strong geometric accent shape carries the issuer's brand color, set against generous white space, with confident modern typography** — not ornate borders, not clip-art. The gold seal (§5) and QR code are fixed elements across all ten; only the accent geometry, color application, and layout rhythm vary.

No static preview image ships for these templates — there is no `assets/` folder, and a screenshot would just go stale against the live components. The canonical reference is the brand setup wizard's live preview (`/dashboard/brand`, Phase 3 per `docs/build-phases.md`), which renders the issuer's actual chosen template with sample data; read the template descriptions below alongside the component source in `lib/certificates/templates/` for anything a live preview doesn't answer.

**Shared elements across all 10 templates** (non-negotiable, system-enforced):
- Certified gold seal — bottom-right (or the template's fixed seal position; never moved by the issuer)
- Verification QR + public ID — positioned so it is never directly beneath the signature block (never two trust marks stacked in one column); centered when the signature is left-aligned, opposite-aligned when the signature is centered
- Issuer logo + name, top area
- Trainee name in display serif, largest text on the page
- Signature line + signatory name/title
- "CERTIFICATE OF COMPLETION" always its own line, generously sized and bold — never sharing a text line with the issuer name

### Angle (`angle.tsx`)
A bold diagonal color block runs from the top-left corner down the left edge, in the issuer's brand color. Logo sits inside the color block in reversed (white) type. All content right-aligned to a generous margin. Confident, editorial, slightly architectural.

### Frame (`frame.tsx`)
A thin, full-perimeter rule in the brand color, with a solid brand-color header band holding just the issuer name/tagline. "CERTIFICATE OF COMPLETION" sits centered in the body, above the bearer name — not crammed into the header band. Reads more traditionally "certificate-like" while staying minimal — best fit for issuers in formal/regulated fields (safety, compliance training).

### Block (`block.tsx`)
A bold solid brand-color rectangle occupies roughly the right third of the page (logo + issuer info + signature reversed inside it), while the trainee's name and program details sit in the open white two-thirds. Strongest, most contemporary of the ten — best fit for creative/tech/media training issuers.

### Ribbon (`ribbon.tsx`)
A folded ribbon in the brand color sits in the top-left corner, sized generously so the full issuer name always fits inside the color and never crosses onto the white background. Everything else — the completion label, bearer name, program info, QR, and public ID — is centered.

### Monogram (`monogram.tsx`)
A circular emblem (issuer initials) mounts top-center. Deliberately generous spacing between the issuer name, the completion label, and the bearer name — nothing crowds anything else.

### Wave (`wave.tsx`)
A soft asymmetric wave in the brand color anchors the footer. The signatory block (left-aligned) and the QR/public ID (centered) share one bottom line — never stacked on top of each other.

### Hex (`hex.tsx`)
A hexagon motif in the brand color sits top-right, decorative and technical. Left-aligned body content.

### Split (`split.tsx`)
Mirrored diagonal corners in the brand color, top-left and bottom-right. Centered content.

### Deco (`deco.tsx`)
Stepped geometric bars in the brand color accent both top corners. Centered content.

### Halo (`halo.tsx`)
The quietest of the ten: a faint gold ring (fixed gold, not brand-driven — it echoes the seal) plus a dashed perimeter border. Centered content.

Each template is a `@react-pdf/renderer` component in `lib/certificates/templates/`, all consuming the same `BrandConfig` + `CertificateData` props (`lib/certificates/types.ts`) so switching templates is a data-driven choice, never a rebuild. `lib/certificates/templates/index.ts` maps each `Organization.brand.template_id` to its component.

---

## 5. The Certified gold seal (spec)

- Real artwork, not code-drawn: `public/brand/certified-seal.jpg` (the gold medallion, "CERTIFIED · TRUST · QUALITY · EXCELLENCE · DIGITAL VERIFICATION"), embedded identically by two parallel components:
  - PDF: `lib/certificates/GoldSeal.tsx` — `@react-pdf/renderer`'s `<Image>`, fetched by absolute URL built from `NEXT_PUBLIC_APP_URL` (react-pdf's asset loader always fetches by URL, same reasoning as `lib/certificates/fonts.ts`'s font loading).
  - Web: `components/GoldSeal.tsx` — a plain `<img src="/brand/certified-seal.jpg">`, for anywhere outside a PDF: verification page header, "Approved Issuer" badge, marketing site.
  - Both crop the source image to a circle (`border-radius` + `object-fit: cover`) so it reads as a clean medallion regardless of the certificate/page background behind it — the source file itself sits on a light square backdrop.
- Colors: fixed by the artwork itself — never recolored to match issuer brand.
- Placement: bottom-right by default (a few templates place it elsewhere per their own layout — Block and Split — but always at a fixed spot per template, never issuer-configurable), fixed size ratio relative to page (~9% of page width), never resized smaller than legibility allows, never rotated, never overlapped by other content. The size ratio is a certificate-layout rule; standalone badge/header uses of `components/GoldSeal.tsx` aren't held to it.
- The same artwork is reused everywhere the platform needs to represent its own trust mark: verification page header, "Approved Issuer" badge, marketing site (via `components/GoldSeal.tsx`), and certificate PDFs (via `lib/certificates/GoldSeal.tsx`).

---

## 7. Interaction states (every clickable element, no exceptions)

Every interactive element ships with all five states below — "we'll add hover states later" is not a valid build state for any component that reaches production.

| Element | Default | Hover | Active/pressed | Focus-visible | Disabled |
|---|---|---|---|---|---|
| **Primary button** | Navy fill, white text | Fill darkens 8%, 1px lift (`translateY(-1px)`), shadow appears | Scale 0.97, shadow flattens | 2px gold outline, 2px offset | 40% opacity, no pointer events, no hover/active transitions |
| **Secondary button** | White fill, navy border/text | Border → navy-2, subtle bg tint (`--certified-surface-2`) | Scale 0.97 | 2px gold outline | Same as above |
| **Ghost/text link** | Navy text, no underline | Underline fades in (150ms), text color unchanged | Text color darkens slightly | 2px gold outline on the text, 2px offset | Muted gray, no underline ever |
| **Nav item (top nav / sidebar)** | Muted text | Text → primary color, background tint fades in | — | Gold outline | — |
| **Sidebar nav item (active/current page)** | Persistent left-border accent (3px, brand color) + bold weight (500) + tinted background — distinct from hover, must not be confused with it | (hover on the active item still shows the hover tint layered on top) | — | Gold outline | — |
| **Card (directory, dashboard list)** | Flat, hairline border | Scale 1.0 → 1.015, shadow lift, border → `--border-strong` | Scale settles to 1.005 | Gold outline around whole card | — |
| **Table row (admin/dashboard tables)** | Transparent | Background tint (`--certified-surface-2`) | — | Outline on the focused cell/row, not the whole table | Row dimmed 50% if the record is suspended/inactive, with a small status badge explaining why |
| **Status badge/pill (Valid/Revoked/Pending/etc.)** | Static — badges never animate on hover, they're informational not actionable | — | — | If wrapped in a link, the link gets the outline, not the badge itself | — |
| **Icon button (e.g. table row actions)** | Muted icon, no visible bounds | Circular background tint fades in behind the icon | Scale 0.92 | Gold outline, circular | 40% opacity |
| **Toggle switch (e.g. "open to hire")** | Track gray, thumb left | Track darkens slightly | Thumb slides with a 150ms spring, track color crossfades to brand color when "on" | Gold outline around the whole switch | — |
| **Dropdown/select trigger** | Bordered, chevron icon | Border → strong | — | Gold outline | — |
| **Dropdown menu (open state)** | — | Menu fades + scales in from the trigger (transform-origin at trigger), 120ms | Menu item hover = row tint | Keyboard nav highlights item with same tint as hover | — |
| **Tab switcher** | Underline under active tab | Hover shows a faint underline preview on inactive tabs | Underline slides to new position on click (200ms `ease-out`), doesn't just snap | Gold outline on focused tab | — |
| **Input field** | Hairline border | Border → strong | — | Border → brand color + 2px gold outline ring | Gray background, muted text, no border color change on hover |
| **Tooltip** | Hidden | Fades in after 400ms hover delay (not instant — avoids flicker on fast mouse movement) | — | Also triggered on keyboard focus, not hover-only | — |

General rules:
- Every hover/active transition uses the durations from §2's motion table (150–250ms, `ease-out`) — nothing snaps instantly except toggles/badges where instant state communication matters more than polish.
- Disabled elements never receive hover/active styling or transition — visually inert immediately.
- Focus-visible (keyboard) styling is never skipped in favor of hover-only styling — every hoverable element must also be reachable and clearly indicated via keyboard.

## 8. Dashboard shell & responsive patterns (issuer dashboard + staff console)

Both `/dashboard` and `/staff` share one dashboard-shell component, themed slightly differently (issuer = navy sidebar, staff console = a visually distinct dark-slate sidebar so staff never mistake which surface they're in).

- **Desktop (≥1024px)**: fixed left sidebar (240px), full labels + icons, top bar with search (staff console) or quick-actions (issuer dashboard), content area with max-width constraint on forms (720px) but full-width on tables/directories.
- **Tablet (768–1023px)**: sidebar collapses to icon-only (64px) with tooltips on hover/focus revealing labels; top bar remains.
- **Mobile (<768px)**: sidebar becomes a slide-in drawer (hamburger trigger in top bar), all tables convert to stacked card layout (never horizontal-scroll a data table on mobile), forms go full-width single column.
- **Sidebar nav item visibility is role-driven at the data layer, not CSS-hidden** — a Finance staff account's sidebar literally never requests or renders the "Applications" nav item; this isn't just a visual restriction (see `docs/roles-permissions.md` §3 on enforcing at three layers).
- Loading states inside the shell use skeleton screens shaped like the eventual content (per §2), never a centered spinner for content-shaped loads — spinners are reserved for button-level inline actions (e.g. "Issuing certificate…" inside the submit button itself).
- Empty states (no programs yet, no certificates yet, no leads yet) get an illustration-free, text-plus-CTA treatment — one line explaining the empty state, one primary button to the relevant next action. Never a bare blank table.

## 9. Role-based UI notes

- Staff console top bar always shows the logged-in staff member's name + a role badge (Admin / Account Manager / Finance) in a small pill — so it's always visually obvious which capabilities are in scope, reducing "wait, why can't I do this" support load internally.
- Admin viewing a page normally scoped to Account Manager or Finance sees the same layout those roles see, not a superset UI bolted on — Admin's extra powers live in their own dedicated pages (`/staff/team`, `/staff/settings`) rather than extra buttons scattered across every shared page.
- Any action a role attempts but can't perform (e.g. a stale UI state after a role change) must fail server-side with a clear "you don't have permission for this" message — never a silent no-op, which reads as a bug rather than a permissions boundary.

## 10. Accessibility

- Color contrast ≥ WCAG AA across platform UI (navy-on-white and white-on-navy both pass comfortably; gold-on-white text is decorative only, never used for body copy).
- All interactive elements keyboard-navigable, visible focus rings (2px gold outline, offset 2px).
- Verification page and directory must be fully usable with a screen reader — status (Valid/Revoked/Expired) must never be conveyed by color alone; always paired with text + icon.
