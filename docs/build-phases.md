# Certified — Build Phases & Prompts

Read `docs/blueprint.md` and `docs/design-system.md` before Phase 0. Each phase below is meant to be handed to Claude Code as a working brief — paste the prompt, let it work, review, commit, move to the next phase. Don't skip ahead; later phases assume earlier ones are done and tested.

**Before any of this:** read `CLAUDE.md`'s "Free-tier discipline" and "Git workflow" sections. Every phase below is built and tested **locally** by default — commits happen incrementally on a phase branch, a PR opens when the phase is ready, and merging, deploying, or touching any hosted/metered service (Supabase hosted project, Vercel deploy, real Upstash/Resend/Altcha calls) waits for explicit go-ahead. A phase prompt saying "build X" means build and test it locally — it does not by itself mean deploy it or run it against live infrastructure.

---

## Account setup (do this before Phase 0)

| # | Service | Steps | Free tier notes |
|---|---|---|---|
| 1 | **GitHub** | Create a private repo `certified`, push this scaffold as the first commit. Branch protection on `main` (PR required, no direct pushes) is configured automatically as the first step of Phase 0 via `gh` — no manual setup needed here, just make sure the GitHub CLI is installed and authenticated (`gh auth login`) before starting Phase 0. | Free for private repos. |
| 2 | **Vercel** | Sign up with GitHub, "Import Project" → select the repo, but **disable auto-deploy on push** (Project Settings → Git → Ignored Build Step, set to always skip, or disconnect the Git integration entirely and deploy manually with `vercel --prod`/`vercel` when you actually want a build) — see `CLAUDE.md`'s free-tier discipline. Deploys happen deliberately, not on every commit. | Free Hobby tier covers launch scale, but build-minute quota is finite — this step is what protects it. |
| 3 | **Supabase** | Create a new project (choose a region close to Nigeria/Europe for latency, e.g. `eu-west`). Save the project URL, anon key, and service role key from Settings → API. Enable Email + Google providers under Authentication → Providers. Enable TOTP under Authentication → MFA. Also install the Supabase CLI and run `supabase init` + `supabase start` for local development — this is your default dev target, not the hosted project. | Free tier: 500MB DB, 1GB storage, 50k MAU — plenty at launch, but local dev is still the default per `CLAUDE.md`. |
| 4 | **Upstash** | Create a Redis database (choose a region near your Vercel deployment region). Copy the REST URL and REST token. Use a local/mock rate limiter behind the same interface for day-to-day dev per `CLAUDE.md`; save real Upstash calls for deliberate integration testing. | Free tier: 10k commands/day — easy to burn through with routine testing if you skip the local mock. |
| 5 | **Resend** | Sign up, verify a sending domain (add the DNS records it gives you to your domain registrar) or use their test domain while developing. Get an API key. Use a console-logging mock sender in dev per `CLAUDE.md`. | Free tier: 3,000 emails/month — fine at launch scale, but not for every dev-loop test send. |
| 6 | **Domain** | Point your domain's DNS to Vercel once you're ready to go live (Vercel gives exact records to add). | — |

No account or dashboard is needed for bot protection — Altcha is self-hosted and just needs an `ALTCHA_HMAC_SECRET` generated locally (`openssl rand -hex 32`), per `.env.example`.

Once all keys are collected, fill `.env.local` from `.env.example`. Generate `ADMIN_BOOTSTRAP_SECRET` now too (`openssl rand -hex 32`) — you'll use it once, in Phase 0.5, to create your own first Admin account, then remove/rotate it per `docs/roles-permissions.md` §4.

---

## Phase 0 — Foundation

**Goal:** repo scaffold, Supabase schema, auth wiring, design tokens in code.

**Prompt:**
> Before writing any application code: configure GitHub branch protection on `main` using the GitHub CLI (`gh`) — confirm `gh auth status` is authenticated against this repo first, and ask for a token/login if it isn't. Run the equivalent of:
> ```
> gh api repos/{owner}/{repo}/branches/main/protection \
>   --method PUT \
>   -f required_pull_request_reviews.required_approving_review_count=1 \
>   -f enforce_admins=true \
>   -f required_status_checks=null \
>   -f restrictions=null
> ```
> adjusting `{owner}/{repo}` to this repository, so that direct pushes to `main` are rejected and every change must land via a reviewed, explicitly-merged PR — matching `CLAUDE.md`'s git workflow rule. Confirm the protection is active (`gh api repos/{owner}/{repo}/branches/main/protection` should return the rule, not a 404) before proceeding. Create and switch to a `phase-0-foundation` branch for the rest of this phase's work.
>
> Then: set up a Next.js 14+ App Router project in TypeScript with Tailwind, configured with the color/type/spacing tokens from `docs/design-system.md` §1 as CSS variables and a `tailwind.config` theme extension. Install and configure the Supabase client (server + browser factories per `CLAUDE.md`'s folder structure). Write SQL migrations under `/supabase/migrations` implementing the schema in `docs/blueprint.md` §4 (Organization, Application, TrainingProgram, Trainee, Certificate, AdminUser, AuditLog) with `AdminUser.role` as an enum (`admin | account_manager | finance`), including Row Level Security policies driven by the permission matrix in `docs/roles-permissions.md` §2: applicants can only read/write their own Organization + Application; issuers can only read/write records under their own org_id; Admin can read/write everything; Account Manager can read/write applications, organizations, certificates, and moderation-related tables but not `admin_users` role/status columns or any finance table; Finance can read organizations (limited columns) and financial/usage tables but not applications, KYC document fields, or moderation tables; public/anon role can only read `Certificate` + `Trainee` fields needed for verification and directory display (never `id_document_url`, `nin`, never raw contact fields). Build `lib/permissions.ts` implementing the `can(role, action)` lookup from the same matrix, to be used in every staff-facing API route as the server-side enforcement layer described in `docs/roles-permissions.md` §3. Set up Supabase Auth (email/password + Google OAuth) with a basic sign-up/login flow, a separate `/staff/login` surface with mandatory MFA per `roles-permissions.md` §5, and a `user_type` distinction (`applicant | issuer | staff`) so issuer and staff sessions never cross over. Confirm the project builds and runs cleanly against your **local** Supabase stack (`supabase start`) as an empty shell — per `CLAUDE.md`'s free-tier discipline, don't deploy to Vercel yet; that's a separate, explicitly-requested step, not an automatic part of finishing Phase 0. Commit incrementally, then open the PR from `phase-0-foundation` into `main` and stop there per the git workflow rule.

---

## Phase 0.5 — Super Admin Bootstrap

**Goal:** solve the chicken-and-egg problem of the first staff account, per `docs/roles-permissions.md` §4. Do this right after Phase 0's schema is in place, before building any staff-facing UI.

**Prompt:**
> Implement the super admin bootstrap exactly as specified in `docs/roles-permissions.md` §4: a `scripts/bootstrap-admin.ts` script (run via `npm run bootstrap:admin`) that checks `admin_users` count is zero, verifies `ADMIN_BOOTSTRAP_SECRET` from env, and if both pass, creates the Supabase Auth user plus the first `AdminUser` row with `role = admin`, writing an `AuditLog` row for the bootstrap event. The script must refuse to run (regardless of secret correctness) if any `AdminUser` row already exists — write a test that confirms this. Do not build a public `/staff/bootstrap` web route unless explicitly needed later; the CLI script is the v1 approach. After running it locally against your Supabase project, confirm you can log in at `/staff/login` as the first Admin before moving to Phase 2.

---

## Phase 1 — Applicant onboarding & application form

**Goal:** application intake flow, per `docs/blueprint.md` §3.1.

**Prompt:**
> Build the application flow: sign-up → choose "Business/Training Centre" or "Individual Trainer" → structured multi-step form capturing the fields in `docs/blueprint.md` §3.1. For "Individual Trainer," include the NIN field and render the full text from `docs/declaration-form.md` with a required checkbox, and store `declaration_signed_at`, the declaration text version, and submission IP alongside the NIN and ID upload as described in that doc's implementation note. Handle file uploads (ID document, proof-of-operation docs) to Supabase Storage in a private bucket, re-encoding any image uploads server-side (strip EXIF, re-save as clean JPEG/WebP) before storing. Add the Altcha widget to the final submit step, with server-side challenge verification (`altcha-lib`) on the submit handler. On submit, create an `Organization` (status: pending) and `Application` record. Show the applicant a status page reflecting their current state (pending / more info requested / approved / rejected) with any agent comments visible.

---

## Phase 2 — Staff console shell + application review (Admin, Account Manager)

**Goal:** the role-gated staff console shell and the core Account Manager workflow, per `docs/sitemap.md` §6, `docs/roles-permissions.md`, and the audit-log requirement in `CLAUDE.md`.

**Prompt:**
> Build the staff console shell at `/staff` per `docs/design-system.md` §8: sidebar nav whose items are fetched/rendered based on the logged-in `AdminUser.role` (Finance never receives the "Applications" nav item in its payload, not just a hidden button — per `roles-permissions.md` §3), top bar showing staff name + role badge. Build `/staff` as a role-aware overview page (different widgets for Admin vs Account Manager vs Finance — Finance's version can be a placeholder until Phase 9). Build `/staff/applications` (review queue, oldest-first, with a "resubmitted" filter surfacing prior-attempt history per the no-cooldown decision) and `/staff/applications/[id]` (full submitted data, signed URLs for documents — never public URLs, and for individual trainers the signed declaration text + timestamp from `docs/declaration-form.md`). Implement the three decision actions (approve / request more info / reject), each requiring a reason, each gated through `lib/permissions.ts` (Admin and Account Manager only), each writing an `AuditLog` row, each triggering a Resend email to the applicant. On approve, flip `Organization.status` to `approved` and redirect the (now-)issuer to the brand setup wizard (Phase 3). Confirm a Finance-role test account gets a 403/redirect if it hits `/staff/applications` directly by URL, not just a hidden nav link.

---

## Phase 2.5 — Staff operations: organizations, revocations, moderation, support (Admin, Account Manager)

**Goal:** the rest of the Account Manager's day-to-day surface, per `docs/sitemap.md` §6.

**Prompt:**
> Build `/staff/organizations` (list, searchable) and `/staff/organizations/[id]` (detail — full view for Admin/Account Manager, confirm this same route later serves a reduced-field view to Finance in Phase 9). Build `/staff/certificates` (platform-wide search/filter) and `/staff/revocations` (queue of issuer-submitted or flagged revocation requests, action with required reason, audit-logged). Build `/staff/moderation` (flagged directory content — bios/photos reported or auto-flagged, hide/restore actions). Build `/staff/support` (the escalation/contact queue fed by the public `/contact` form and any in-app "report" actions). All four pages gated to Admin + Account Manager only via `lib/permissions.ts`.

---

## Phase 2.75 — Staff team management & audit log (Admin only)

**Goal:** the Admin-exclusive capabilities that make the role model actually operable, per `docs/roles-permissions.md` §2–3.

**Prompt:**
> Build `/staff/team` (Admin only): list existing staff accounts with role + status, an "invite staff member" flow (email invite via Resend, sets role at invite time — `account_manager` or `finance`; creating another `admin` should require an extra confirmation step given the power involved), role-change and suspend/reinstate actions. Build `/staff/audit-log` showing the full trail for Admin, filtered to "my own actions" automatically for any Account Manager or Finance user who navigates there directly (don't just deny them the page — the spec calls for a scoped view, per `docs/roles-permissions.md` §2). Build `/staff/settings` (Admin only) as a shell for system configuration (certificate template management, rate-limit threshold display, integration status for Resend/Upstash/Altcha) — full config UI can be minimal in v1 (read display + a few editable fields), it just needs to exist and be properly gated.

---

## Phase 3 — Brand setup & certificate templates

**Goal:** issuer brand config + the 10 confirmed templates, per `docs/design-system.md` §4–5.

**Prompt:**
> Build the issuer dashboard shell at `/dashboard` per `docs/design-system.md` §8 (mirrors the staff shell structurally but themed distinctly per §8's note on the two sidebars looking different). Scaffold every page in `docs/sitemap.md` §5 as a route even where the feature ships in a later phase — `/dashboard/settings/team` and `/dashboard/billing` should exist now as clearly-labeled "coming soon" placeholders rather than 404s, so the nav is complete from day one. Build the brand setup wizard at `/dashboard/brand`: logo upload (re-encoded server-side), primary color picker, signatory name/title, signature (typed in a script font or uploaded image), and template selection among the 10 launch templates.
>
> The templates themselves are already built — `lib/certificates/templates/{angle,frame,block,ribbon,monogram,wave,hex,split,deco,halo}.tsx`, each a `@react-pdf/renderer` component consuming shared `BrandConfig` and `CertificateData` props from `lib/certificates/types.ts`, registered by id in `lib/certificates/templates/index.ts`. A shared `<GoldSeal />` react-pdf component already exists at `lib/certificates/GoldSeal.tsx`, and a `<VerificationQr />` component at `lib/certificates/VerificationQr.tsx` (expects a QR data URL/image URL as a prop — wire it up to the `qrcode` package's output at issuance time, in Phase 4). `lib/certificates/fonts.ts` registers Playfair Display + Inter with react-pdf but needs the actual `.ttf` files dropped into `/public/fonts` (see the comment at the top of that file) — do this now so certificates render on-brand rather than falling back to Helvetica/Times-Roman. Provide a live preview in the wizard showing the issuer's brand applied to their chosen template with sample data. Build `/dashboard` itself as the overview page (stats, quick actions, recent activity) once there's real data to show.

---

## Phase 4 — Certificate issuance & verification

**Goal:** core issuance engine + public verification, per `docs/blueprint.md` §3.3–3.4 and the signing rule in `CLAUDE.md`.

**Prompt:**
> Build the single-trainee issuance flow: issuer creates a `TrainingProgram`, adds a trainee (with the consent checkbox from `docs/blueprint.md` §6), system generates a `Certificate` record with a random non-sequential `public_id`, computes an HMAC-SHA256 signature server-side (`CERTIFICATE_SIGNING_SECRET` from env, never exposed to client) over the core fields, stores the signature, renders the PDF via the issuer's chosen template + brand config, uploads it to Supabase Storage, and stores the URL. Build the public verification page at `/verify/[public_id]` (SSR, no auth required): look up the certificate, recompute the signature server-side and compare against the stored one (flip to "integrity check failed" display state on mismatch), and render status (Valid / Revoked / Expired) with the design system's animated reveal (§2). Rate-limit this route via Upstash per `CLAUDE.md` rule 6 (e.g. 10 requests/min/IP). Build the revocation action in the issuer dashboard (reason required, writes AuditLog, flips certificate status, disclosed permanently on the verification page).

---

## Phase 5 — Public directory & search

**Goal:** discoverability, per `docs/blueprint.md` §3.5 and §7.

**Prompt:**
> Build the public directory at `/directory`: search/filter by field/skill, Nigerian state + LGA (static JSON list, structured dropdowns per `docs/blueprint.md` §7), issuer, and completion-date range. Use Postgres full-text search / indexed columns — no external search service. Build the trainee public profile page showing name, photo, bio, certificate(s), issuing org with "Approved Issuer" badge, and an "open to hire" toggle state. Build the issuer's own public page listing their programs and trainee roster. Ensure both are excellent on mobile (design system §3) since verification/discovery traffic is QR/phone-first.

---

## Phase 6 — Contact / hire flow

**Goal:** gated contact per the confirmed decision (gated by default, no public opt-out).

**Prompt:**
> Implement the "Contact" action on trainee and issuer public profiles as a rate-limited reveal-or-relay flow per `docs/blueprint.md` §6: default to an in-app message relay (form → email to the trainee/issuer via Resend, sender never sees raw contact info) rather than exposing phone/email directly. Add the Altcha widget to the contact form, with server-side challenge verification (`altcha-lib`). Rate-limit via Upstash (e.g. 5 messages/hour/IP) to prevent spam. Never render trainee/issuer phone or email in page HTML or API responses to unauthenticated requests, per `CLAUDE.md` rule 5.

---

## Phase 7 — Bulk/CSV cohort issuance

**Goal:** batch issuance without hitting Vercel function timeouts.

**Prompt:**
> Build CSV bulk upload for cohort issuance under a `TrainingProgram`: provide a downloadable CSV template, validate rows on upload (required fields, in-batch duplicate detection, per-row error report shown before commit), then process the batch as a queued job (a `jobs` table + a Vercel Cron-triggered processor, or Supabase Edge Function) rather than a single long-running request — so large cohorts don't hit serverless execution limits. Show the issuer a progress view and a final summary (succeeded/failed rows with reasons).

---

## Phase 8 — Trainee self-claim

**Goal:** let trainees control their own public profile, per the consent/data-rights concern in `docs/blueprint.md` §6.

**Prompt:**
> On trainee creation, send a claim-link email (Resend) with a signed, expiring token. Build the claim flow: trainee verifies via the link, can then edit their bio, photo, contact preferences, and open-to-hire status, or request the profile be hidden/removed (soft-delete, not a hard delete of the underlying certificate record — the certificate must remain independently verifiable even if the directory profile is hidden). This is the NDPA compliance hook noted in the blueprint.

---

## Phase 9 — Finance dashboard, operational analytics & polish

**Goal:** the Finance role's actual surface, operational analytics for Admin/Account Manager, and a full-app polish pass.

**Prompt:**
> Build `/staff/finance` (Admin + Finance): a usage-vs-free-tier dashboard pulling current consumption against known free-tier ceilings (Supabase DB/storage size, Vercel function invocation count if available via API/manual entry, Resend monthly email count, Upstash command count) with a visual warning state as any metric approaches its limit — this is the early-warning system that prevents an unexpected mid-month paid-tier surprise. Build `/staff/finance/reports` (exportable CSV/PDF summaries of issuance volume, org growth, and the usage metrics above) and `/staff/finance/billing` as a placeholder ("no paid plans yet") ready to receive real plan/invoice management when monetization ships (blueprint §10). Build `/staff/analytics` (Admin + Account Manager, read-only for AM): issuance volume over time, approvals/rejections over time, top training fields, geographic spread by state. Add anomaly surfacing per `docs/blueprint.md` §6 (unusual issuance-volume spikes per org) as a flagged list on this page. Then do a full pass on `docs/design-system.md` §2 (motion), §7 (interaction states — confirm every clickable element in the app actually has all five states, not just the ones built early), §8 (responsive dashboard patterns), and §10 (accessibility) across the whole app — public site, issuer dashboard, and staff console alike. This is the polish phase before launch.

---

## Phase 10 — Load-test & launch

**Prompt:**
> Load-test the `/verify/[public_id]` route and the contact-reveal route specifically (these are the highest-traffic, unauthenticated, publicly-linked endpoints) to confirm Upstash rate limits hold under burst traffic without false-positiving legitimate users. Do a full security pass against every row in `docs/blueprint.md` §6's loophole table — confirm each mitigation is actually implemented, not just planned. Then deploy to production on the custom domain.

---

## After every phase, without exception

1. Commit incrementally as you build the phase — not one commit at the end.
2. Open a PR from the phase branch. Do not merge it.
3. Stop and report what's ready for review. Wait for explicit approval before merging, and before doing anything that touches a live/metered service (hosted Supabase, a real Vercel deploy, real Upstash/Resend/Altcha calls) beyond what local development and testing require.

This applies to Phase 10's "deploy to production" step too — propose it, don't just do it.
