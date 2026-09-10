# CLAUDE.md — working guide for this repo

This file orients any Claude Code session working on Certified Africa. Read `docs/blueprint.md`, `docs/roles-permissions.md`, `docs/sitemap.md`, and `docs/design-system.md` before starting a new phase if you haven't already this session.

## What this project is

Certified Africa issues branded, verifiable training certificates on behalf of approved businesses/trainers, and runs a public directory of certified individuals. Full context: `docs/blueprint.md`.

## Non-negotiable rules (do not shortcut these, even under a "let's just get it working" request)

1. **No issuance without approval.** An `Organization` must be `status = approved` before any certificate-generation code path is reachable. Never build a "temporary" bypass, even for testing — use seeded approved test orgs instead.
2. **The gold seal is mandatory and non-configurable.** Every certificate template must render the shared `<GoldSeal />` component (`lib/certificates/GoldSeal.tsx`) at a fixed position; every non-PDF surface (verification page, badges, marketing site) uses the browser equivalent (`components/GoldSeal.tsx`) instead. Both embed the same canonical artwork, `public/brand/certified-seal.png` — these two components are the only place that file should be referenced from. Issuer brand settings must never be able to remove, recolor, or resize either.
3. **Signing key never touches the client.** All HMAC/Ed25519 signing of certificate records happens server-side only (API route / Edge Function), read from `process.env`, never returned in any API response, never logged.
4. **Certificates store snapshots, not live references.** `trainee_name_snapshot`, `program_title_snapshot`, etc. are written once at issuance and never overwritten by later profile edits. Only `status` (active/revoked/expired) changes post-issuance.
5. **Contact info is gated by default.** Trainee `phone`/`email` must never be rendered directly into public HTML/JSON for unauthenticated requests. Route through the reveal/relay endpoint, which is rate-limited (Upstash).
6. **Verification endpoint is public and unauthenticated by design** — but must be rate-limited per IP (Upstash) and must never expose a "list all certificates" or "list all IDs" capability.
7. **Every admin decision (approve/reject/request-info/revoke) writes an `AuditLog` row** — actor, action, reason, before/after. No decision path skips this.
8. **File uploads (logos, ID docs, trainee photos) are re-encoded server-side** (strip EXIF, re-save), never served back as the raw uploaded bytes.
9. **Staff permissions are enforced server-side via `lib/permissions.ts`, never by hiding UI alone.** Every `/staff/*` API route/server action checks `can(role, action)` from `docs/roles-permissions.md` §2 before doing anything. A Finance-role request to an Account Manager-only action must fail with a clear permission error even if it somehow reaches the route — hidden nav links are UX, not security.
10. **The admin bootstrap path only ever runs once.** It must refuse unconditionally once one `AdminUser` row exists, regardless of secret correctness — see `docs/roles-permissions.md` §4. Never weaken this check "for testing."
11. **Organization registration, KYC review, and approval are free — forever, no exceptions.** Payment only ever attaches to *usage* (certificate credits, docs/build-phases.md Phase 11) or *upgrades* (Premium templates, trainee contact-unlock, if/when built) — never to becoming or remaining an approved issuer. Never add a paywall, fee, or "premium onboarding" step to `/apply` or the staff approval flow.
12. **Payment provider secrets and webhook signatures follow rule #3's exact discipline.** `FLUTTERWAVE_SECRET_KEY`/`PAYSTACK_SECRET_KEY` (and any future provider's) are server-only, read from `process.env`, never returned in an API response, never logged. Every webhook route verifies the provider's signature before trusting anything in the payload — no exceptions for "just testing." `organizations.certificate_credits` (and any future paid-balance column) is mutated only via its dedicated `SECURITY DEFINER` Postgres function, never a direct client or owner write — see `supabase/migrations/0030_certificate_credits.sql`.

## Free-tier discipline (read this before running anything against a live service)

Every service this project uses is on a free tier during build. Free tiers are finite and shared across the whole build — burning through Vercel build minutes, Upstash's daily command quota, or Supabase's compute hours on routine iteration costs real velocity later, not just "some usage." These rules apply for the entire build, not just early phases:

1. **Local-first, always.** Day-to-day development and testing runs against `npm run dev` and a local Supabase stack (`supabase start` via the Supabase CLI), not the hosted project. Only touch the hosted Supabase project when a phase genuinely needs to test something environment-specific (OAuth redirect behavior, Storage CDN URLs) — and say so explicitly before doing it.
2. **No deploy is ever a side effect.** Vercel's default auto-deploys on every push. This project's Vercel setup must have auto-deploy on push disabled (Ignored Build Step, or a disconnected Git integration with manual `vercel --prod`/preview deploys instead) — see `docs/build-phases.md` account setup. Never deploy (preview or production) as a routine part of finishing a task. Deploy only when explicitly asked, or when proposing it at a genuine phase-completion milestone — and wait for a yes before doing it.
3. **Don't exercise metered services in a tight loop.** Upstash rate-limiting, Resend email sending, Altcha challenge verification — build and iterate against local/mock implementations behind the same interface (an in-memory limiter, a console-logging "email sender" in dev mode) during normal development. Only point at the real service for deliberate, occasional integration testing, never on every manual test of a form or endpoint.
4. **Ask before spending real quota.** Running a migration against the hosted Supabase project, doing a real Vercel deploy, sending a batch of real Resend emails, load-testing against real Upstash — all of these need an explicit go-ahead first, especially at the phase boundaries in `docs/build-phases.md`. Finishing a phase's code is not the same as exercising it against live infrastructure — treat those as two separate steps, and don't assume the second is wanted just because the first is done.
5. **When genuinely unsure whether something will touch a live/metered service, ask first rather than finding out by hitting a rate limit or a bill.**

## Git workflow

- Commit incrementally as work progresses through a phase — small, clearly-described commits, not one giant commit at the end.
- Work on a feature branch per phase (e.g. `phase-3-brand-setup`), never directly on `main`.
- Open a pull request once the phase is ready for review. **Never merge it.** Merging is always a separate, explicit decision — stop after opening the PR and wait for approval, regardless of how complete or low-risk the change looks.

## Stack conventions

- Next.js App Router, TypeScript throughout.
- Supabase client: server-side calls use the service role key only inside API routes / server actions — never expose it to the client bundle.
- Certificate PDFs: `@react-pdf/renderer` components live in `lib/certificates/templates/`. Each template imports the shared `<GoldSeal />` and `<VerificationQr />` components — do not hand-roll the seal per template.
- Styling: Tailwind, using the tokens defined in `docs/design-system.md` (don't invent new colors/spacing ad hoc — extend the token file if something's missing).
- Motion: Framer Motion for page/component transitions, respecting `prefers-reduced-motion` (see design system §Motion).

## Folder structure (target)

```
/app                    Next.js routes (App Router)
  /(public)              marketing pages, verification, directory, org public pages
  /(auth)                login, signup, staff login, application flow
  /dashboard              issuer dashboard — full page set in docs/sitemap.md §5
  /staff                  role-gated staff console — full page set in docs/sitemap.md §6
  /api                    route handlers (issuance, verification, revocation, uploads)
/components              shared UI components
/lib
  /certificates/templates  react-pdf template components
  /certificates/sign.ts    signing/verification logic (server-only)
  /permissions.ts          can(role, action) — the enforcement source of truth, see docs/roles-permissions.md
  /supabase                client factories (server + browser)
  /rate-limit              Upstash helpers
/scripts/bootstrap-admin.ts  one-time first-admin creation, see docs/roles-permissions.md §4
/docs                    blueprint, design system, sitemap, roles/permissions, build phases, declaration form
/supabase/migrations     SQL migrations (schema from blueprint §4)
```

## When starting a new phase

1. Re-read the relevant phase section in `docs/build-phases.md` — use its prompt as your working brief.
2. Check `docs/blueprint.md` §4 (data model) and §6 (security table) for anything the phase touches.
3. If a decision isn't covered by the blueprint or design system, stop and ask rather than assuming — flag it plainly rather than picking silently.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
