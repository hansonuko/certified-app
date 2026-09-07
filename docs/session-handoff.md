# Session Handoff

Running record of where the build actually stands — what's live, what's
verified, what's still open. Read this alongside `docs/build-phases.md`
(the plan) before starting a new phase; this doc is the "what actually
happened" complement to that plan.

**Last updated:** 2026-09-06 — Phases 5, 6, and 7 all merged (PRs #11–#17),
plus an out-of-band fix/UX PR (#18: an `/apply` hang, password-visibility
toggles, staff password reset — see §15). **18 PRs merged, none open.**
Migrations `0001`–`0022` all confirmed live on the hosted project (checked
directly, not from memory — see §2). **Phase 8 (trainee self-claim) is
next up** — see §16 for its scope and the real open design questions to
settle before building it.

---

## 1. Where things stand

| Phase | Status | PR | Notes |
|---|---|---|---|
| 0 — Foundation | ✅ merged | #1 | Next.js scaffold, Supabase schema (0001–0009), auth (issuer + staff/MFA), `lib/permissions.ts` |
| 0.5 — Super Admin Bootstrap | ✅ merged | #2 | First Admin created live: **Hanson Uko / certifiedafrica1@gmail.com** — see §4. **Recreated once**, see §10 — current admin id is `faa4335d-9ef8-4a36-957b-8714478e7e23` |
| 1 — Applicant onboarding | ✅ merged | #3 | Identification-based (NIN dropped), migration 0010 |
| 2 — Staff console + application review | ✅ merged | #4 | `/staff/applications`, approve/request-info/reject, audit log, email |
| 2.5 — Organizations (partial, by design) | ✅ merged | #5 | Only `/staff/organizations` — Revocations/Moderation/Support still deferred, see §3 |
| 3 — Brand setup & templates | ✅ merged | #6 | Dashboard shell, brand wizard, migration 0011, real fonts, all 10 templates |
| 4 — Certificate issuance & verification | ✅ merged | #9 | Program CRUD, single-trainee issuance, `/verify`, revocation. Migrations 0012–0015 |
| — Rebrand: pan-African "Certified Africa" | ✅ merged | #10 | See §11. Migrations 0016–0017 |
| 5 — Public directory & search | ✅ merged | #11, #12, #13 | `/directory`, `/directory/trainee/[id]`, `/directory/org/[slug]`. Migrations 0018–0019 |
| 6 — Contact/hire flow | ✅ merged | #14, #15 | Reveal-or-relay on both trainee and issuer public profiles. Migration 0020 |
| 7 — Bulk/CSV cohort issuance | ✅ merged | #16, #17 | CSV upload/validate/enqueue + Cron-or-page-view-driven processor. Migrations 0021–0022 |
| — `/apply` hang fix + password UX + staff reset | ✅ merged | #18 | See §15. No schema change |
| 8 — Trainee self-claim | **not started** | — | Next up, see §16 |

18 PRs merged in order, none open as of this writing. `main` builds clean
(`npx tsc --noEmit`, `npm test`) as of `3d62145` — `npm run build` wasn't
re-run after the very latest commits specifically to avoid disrupting a
live dev server a session had open for the user's own testing; worth a
fresh `npm run build` early in the next session just to confirm, since
it's cheap insurance.

---

## 2. Live infrastructure

**Vercel (production)**: https://certified-app-lime.vercel.app — live as
of the Phase 4 era (§8). Not redeployed since — Phases 5–7 and the #18
fixes only exist on `main`/hosted Supabase, not on production yet. `vercel.json`
(added in Phase 7) declares a Cron job hitting `/api/cron/process-bulk-
issuance` every 5 minutes — this has **never actually run**, since it only
fires once deployed, and **`CRON_SECRET` is not yet set on the Vercel
project** (only documented in `.env.example`, blank in `.env.local` too).
Before the next real production deploy: generate and set `CRON_SECRET` on
both `.env.local` and the Vercel project's env vars, or the Cron route's
auth check has nothing to check against (it no-ops the check entirely when
the env var is unset — fine for local dev, not for production).

**Supabase project**: `wvcvzeybvloamkkghckp` (hosted, not local — still no
Docker/Supabase CLI in this environment).

**Migrations `0001`–`0022` all confirmed applied** — verified directly this
session via a throwaway script querying real columns/tables through the
service-role client (not assumed from memory or from what was "sent").
Schema now covers: `organizations` (+ `slug`/`bio`/`training_fields`/pan-
African address columns), `applications`, `training_programs` (+
`certificate_validity_months`), `trainees` (+ pan-African location columns,
`claim_token`/`claimed`/`claimed_by_user_id` already present since 0006 but
**still unused** — see §16), `certificates`, `admin_users`, `audit_log` (+
`actor_user_id`, actor_type now `system`/`staff`/`issuer`), `jobs` (+
`processing_lock_expires_at`), plus views `organizations_public_view` /
`trainees_public_view` / `directory_listings_view` and the
`verify_certificate()` function. Storage buckets: `application-documents`
(private), `org-brand-assets`, `certificates`, `trainee-photos` (all three
public).

**Lesson learned this session, worth repeating**: `CREATE OR REPLACE
VIEW`/`FUNCTION` can only *append* new output columns — it cannot rename or
reorder existing ones (Postgres `42P16`/`42P13`). Every migration this
session that changed an existing view/function's shape used `DROP ... IF
EXISTS` first; every migration that only *added* columns used a plain
`CREATE OR REPLACE` safely. Check which case you're in before writing the
next one.

**First Admin**: unchanged since §10 — `ADMIN_BOOTSTRAP_SECRET` stays
blank in `.env.local`, script refuses to run again regardless.

**`.env.local`** — status since the last update:

| Var | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | ✅ set, live project |
| `CERTIFICATE_SIGNING_SECRET` / `ALTCHA_HMAC_SECRET` | ✅ set, both actively exercised now (issuance + application/contact forms) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | ✅ set, still **mocked to console outside production** (`lib/email/send.ts`) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ❌ **still empty**. `/verify` and the contact relay both run on in-memory rate limiters (`lib/rate-limit/verify-limiter.ts`, `lib/rate-limit/contact-limiter.ts`) behind a `RateLimiter` interface real Upstash can drop into later |
| `ADMIN_BOOTSTRAP_SECRET` | ❌ empty (intentional) |
| `CRON_SECRET` | ❌ empty locally (fine for dev — the Cron route's auth check no-ops when unset) — **must be set before a real Vercel deploy**, see above |

**Not configured at all**: Google OAuth (unchanged from before).

---

## 3. Known open items (flagged along the way, not silently patched)

1. **No resubmission path yet.** `/apply` still redirects anyone who
   already has an Organization straight to `/apply/status`, regardless of
   status — still no UI for a second Application after a rejection.
   Flagged since PR #4, still unaddressed.
2. ~~Certificate PDF font paths~~ — **resolved in Phase 4**
   (`lib/certificates/fonts.ts` builds absolute URLs from
   `NEXT_PUBLIC_APP_URL`).
3. ~~`CertificateData` assembly gap~~ — **resolved in Phase 4**
   (`durationLabel`/`dateRangeLabel` are joined from `TrainingProgram` at
   issuance time, `lib/certificates/issue.tsx`).
4. **Staff moderation/support surfaces still don't exist.**
   `/staff/revocations`, `/staff/moderation`, `/staff/support` are still
   unbuilt. Certificates and a real contact flow both exist now (Phases 4
   and 6), so the *data* these pages would work with is there — moderation
   (`trainees.is_hidden`/`flagged_reason`) is exactly what Phase 8's
   self-claim flow starts to touch (§16), which may be the natural trigger
   to finally build the moderation queue too, even though it's not
   formally in Phase 8's own scope.
5. **Upstash is still unconfigured** (§2) — both rate-limited endpoints run
   on in-memory limiters. Fine for a single-instance dev/demo, not for
   real multi-instance production traffic.
6. **`directory_listings_view` fans out per certificate, not per trainee**
   (`supabase/migrations/0018`) — the app groups rows into one card/profile
   per trainee at the application layer (`app/directory/page.tsx`'s
   `groupByTrainee`). Directory pagination is an in-memory slice over up to
   600 fetched rows, not a true distinct-trainee SQL count — a deliberate
   v1 shortcut, flagged in that file's own comments, worth revisiting if
   the directory ever has real scale.
7. **Bulk issuance processing speed depends on Cron actually running.**
   Vercel's Hobby tier limits Cron to once a day; the job status page's own
   opportunistic `advanceJob()` call (lib/bulk-issuance/processor.ts) is
   the practical way a batch actually completes promptly today — see §14.

---

## 4. Security hygiene reminders

Unchanged from before: several real secrets passed through chat directly
early in the build (DB password, service-role key, first Admin's
password). None rotated as of this writing. Still just hygiene, still not
urgent, still worth doing at a natural pause.

---

## 5. Patterns established — follow these, don't reinvent

- **Three-layer permission enforcement**, **`audit_log`/`certificates` have
  no RLS write policy for anyone**, **column-level restriction is views**,
  **certificate verification is a function, not a view**, **shared
  react-pdf components**, **email mocked outside production**,
  **bootstrap-admin's guard logic in a separate pure file** — all unchanged
  from before, still the rules.
- **`jobs` follows the same "no direct write path" pattern as
  `certificates`/`audit_log`**, one step further: the owner can `INSERT`
  and `SELECT` their own jobs, but there's no `UPDATE`/`DELETE` policy for
  anyone — every progress/status mutation goes through
  `lib/bulk-issuance/processor.ts`'s `advanceJob()` via the service-role
  client. When two different triggers can call the same privileged
  function (Cron *and* a page view, here), guard it with a short-lease lock
  (`jobs.processing_lock_expires_at`) rather than assuming only one caller
  ever runs at a time.
- **Certificate issuance logic lives in one place**:
  `lib/certificates/issue.tsx`'s `issueCertificate()` (sign → QR → render →
  upload → insert) is called by both the single-entry action
  (`app/dashboard/programs/[id]/issue/actions.ts`) and the bulk processor
  (`lib/bulk-issuance/processor.ts`). Don't let a third call site
  reimplement this — extend the shared function's params instead.
- **Contact relay stores nothing** (`lib/contact/actions.ts`) — no
  messages table, just an in-memory rate limiter and an outbound email with
  the sender's own contact info as `replyTo`. Don't add persistence to this
  without a reason; it was a deliberate choice to minimize stored PII.
- **Pan-African location fields**: `lib/geo/africa.ts` (the country/region
  dataset) + `components/LocationFields.tsx` (the shared form fields) are
  the only place this logic should live — don't hand-roll a second country
  dropdown or duplicate the region-label-by-country lookup elsewhere.
- **`components/PasswordField.tsx`** is now the only password `<input>`
  pattern in the app (show/hide toggle, `tabIndex={-1}` on the toggle
  button so it doesn't break tab order) — use it for any future password
  field rather than a raw `<input type="password">`.
- **CSV parsing has no external dependency** (`lib/csv.ts`) — a small
  hand-rolled RFC4180-ish parser/writer, shared between the browser-side
  instant preview and the server-side re-validation
  (`lib/bulk-issuance/validate.ts`). Don't pull in a CSV library for
  anything this format-simple without a real reason to.
- **`CREATE OR REPLACE VIEW`/`FUNCTION` can only append columns** — see §2's
  callout. Check this before writing a migration that changes an existing
  view/function's output shape.

---

## 6. Environment quirks worth knowing before you hit them

- **Turbopack dev-server degradation over a long session is real and
  looks exactly like an application bug.** After several hours and dozens
  of file edits/hot-reloads in one `npm run dev` session, every request's
  middleware overhead crept up to 5–20+ seconds — an `/apply` form
  submission that should take a couple of seconds appeared to "hang
  indefinitely" as a result (see §15). Confirmed it wasn't application
  logic by checking the database directly (zero rows had been created) and
  by timing routes before/after a restart (20s+ → under 1s). **Fix is
  always the same as noted before**: stop the server (check
  `Get-CimInstance Win32_Process -Filter "name='node.exe'"` for stray
  `certified-app` processes specifically, don't assume the tracked
  background task is the only instance — one survived being "killed" by
  the harness and had to be found and stopped manually this session),
  `rm -rf .next`, restart. **Do this proactively** after a long stretch of
  edits, not just reactively once something seems broken.
- **Supabase round-trip latency in this environment is genuinely high even
  when healthy** — a plain `select count(*)` measured 4–7 seconds via a
  direct Node script (no Next.js/middleware involved at all). Any action
  chaining several sequential Supabase calls (file uploads, multi-attempt
  inserts) should parallelize the independent ones (`Promise.all`) rather
  than assume round trips are cheap — see the `/apply` action's fix in §15.
- **Turbopack dev-server cache corruption** (`0xc0000142` panics on
  `app/globals.css`), **stray dev-server processes from other projects**,
  **browser-automation coordinate clicks being unreliable** (prefer
  `javascript_tool`'s `element.click()`), **backtick-mangled `-m` commit
  messages** (use `git commit -F <file>`), **Next.js 16's Middleware →
  Proxy rename**, **Google's font repo only shipping variable fonts** — all
  still true, unchanged from before.
- **The Claude-in-Chrome browser extension was not connected this
  session** — worth checking `tabs_context_mcp` early if a task might need
  it, rather than assuming it's available and discovering otherwise
  mid-task.

---

## 7. Production deployment (first deploy, Phase 4 era)

Unchanged from before — see the full incident write-up that used to live
here, now folded into this doc's history: Vercel env vars were registered
but empty, fixed via the API, confirmed `/`, `/login`, `/staff/login` all
200 on `https://certified-app-lime.vercel.app`. **Not redeployed since** —
everything from Phase 5 onward (§1) exists only on `main` + hosted
Supabase, not on production. `CRON_SECRET` in particular needs to be set
before the next deploy (§2).

## 8. MFA incident — don't repeat this

Unchanged from before: a test TOTP factor was enrolled on the real
bootstrap Admin account during Phase 0/2/2.5 testing rather than a
disposable staff account, stranding the real user's first login. Lesson
holds: never touch MFA on a real/production account during testing, use a
disposable staff account instead.

## 9. Account deletion & recovery

Unchanged from before: the original bootstrap Admin account was
accidentally deleted via the Supabase Dashboard, recovered via
`scripts/bootstrap-admin.ts` with a fresh `ADMIN_BOOTSTRAP_SECRET` (id
`faa4335d-9ef8-4a36-957b-8714478e7e23`), `organizations`/`applications`
confirmed empty throughout so nothing real was lost.

---

## 10. Phase 4 merge + pan-African rebrand ("Certified Africa")

Phase 4 (PR #9) merged after fixing a migration deadlock (split
`0012`→`0012`–`0015`) and a `CREATE OR REPLACE FUNCTION` shape error
(`DROP FUNCTION` first). Immediately after, the project's scope changed:
renamed to **Certified Africa**, geography expanded from Nigeria-only to
pan-African, landing on Country (structured, all 54 states) + Region
(structured for Nigeria/Ghana/Kenya/South Africa, free text elsewhere) +
Locality (free text everywhere) — `lib/geo/africa.ts`. The gold seal's own
wordmark deliberately stayed "CERTIFIED" rather than "CERTIFIED AFRICA" —
the trust mark and the company name are allowed to differ, and changing it
would've meant reworking fixed-position artwork across all 10 templates
for no functional gain. Migrations `0016`–`0017` (organizations/trainees
address columns renamed + `country` added). Repo name, Vercel project, and
production URL deliberately left untouched — that's still true, still a
separate future decision if wanted.

---

## 11. Phase 5 — public directory & search

Three PRs, one per page, each merged before the next started (per the
user's explicit "commit, push, open PR, wait for my call" rhythm this
session):

- **PR #11**: `/directory` — search/filter by name/field/program (plain
  `ILIKE`, sanitized against `.or()`'s own filter-string syntax
  characters), structured Country filter, structured Region filter for the
  four priority countries, issuer, completion-date range, open-to-hire.
  Migration `0018` added `directory_listings_view` — the platform's first
  anon-facing *listing* surface over certificates, deliberately scoped
  (active certs, approved orgs, non-hidden trainees, never phone/email) and
  explicitly documented as *not* conflicting with `verify_certificate()`'s
  "no enumeration" rule (that rule is about the single-lookup verification
  endpoint, not the directory, which is designed to be a public listing).
- **PR #12**: `/directory/trainee/[id]` — trainee public profile. **Shipped
  at the wrong path** in this same PR (`/directory/[id]` instead of the
  documented `/directory/trainee/[id]`) — caught and fixed in PR #13,
  flagged directly rather than left quiet.
- **PR #13**: `/directory/org/[slug]` — issuer public page. Found two more
  gaps while building it: organizations had no `slug` (needed for the
  documented route) or public `bio`/`training_fields` (blueprint says the
  application's `training_description`/`training_fields` "becomes the
  public training profile," but nothing ever copied them over). Both fixed
  via migration `0019` — `slug` generated at application time
  (`lib/slug.ts`, collision-retried like certificate `public_id`),
  `bio`/`training_fields` populated by the staff approve action.

## 12. Phase 6 — contact/hire flow

Two PRs, trainee then issuer, sharing one generic implementation built in
the first:

- **PR #14**: `lib/contact/actions.ts` + `components/ContactForm.tsx` — the
  reveal-or-relay flow (Altcha → rate limit → server-side lookup of the
  real contact email via service-role client → Resend email with the
  sender's own contact info as `replyTo`). Wired into the trainee profile
  first. Judgment calls made per the user's "use your best judgement": no
  message-content persistence (pure relay, not an inbox); `trainees.
  contact_visibility = 'hidden'` suppresses the form entirely, `'public'`
  and `'gated'` behave identically (raw exposure isn't allowed either way
  under the "no public opt-out" decision, so that enum effectively only has
  two meaningful states today). Migration `0020` added
  `contact_visibility` to `directory_listings_view`.
- **PR #15**: same mechanism wired into the issuer public page — always
  shown (no visibility toggle exists for organizations), no schema change.

## 13. Phase 7 — bulk/CSV cohort issuance

Two PRs, upload/validate/enqueue then the processor:

- **PR #16**: `lib/csv.ts` (dependency-free parser/writer) +
  `lib/bulk-issuance/validate.ts` (shared client+server validation —
  required fields, date format, in-batch duplicate detection by name +
  completion date) + migration `0021`'s `jobs` table (owner can insert +
  read own jobs only; every other mutation is service-role-only, matching
  the `certificates`/`audit_log` pattern) + the upload/preview UI at
  `/dashboard/programs/[id]/bulk-issue`. Consent is one batch-level
  checkbox, not per-trainee — a deliberate, flagged weakening of the
  single-entry flow's per-person attestation.
- **PR #17**: `lib/certificates/issue.tsx` (issuance logic extracted out of
  the single-entry action so both paths share it) + `lib/bulk-issuance/
  processor.ts`'s `advanceJob()` (processes up to 3 rows per call) +
  `app/api/cron/process-bulk-issuance` (the real Vercel Cron target,
  `vercel.json`, `CRON_SECRET`-protected) + migration `0022`'s short-lease
  lock. **Free-tier reality check, flagged directly**: Vercel's Hobby tier
  limits Cron to once a day, which alone would leave a queued batch
  stalled for a long time — so the job status page also calls
  `advanceJob()` on every load/auto-refresh (same lock, so it can't race
  Cron into double-issuing), making "keep the status page open" the
  practical way a batch actually finishes promptly. Not yet exercised
  against real Vercel Cron (never deployed since, §2).

## 14. `/apply` hang + password UX + staff password reset (PR #18)

Reported symptom: submitting the application form "loads endlessly
without returning success or failure." Root cause was the dev-server
degradation described in §6, not application logic — confirmed by
querying `organizations`/`applications` directly (zero rows, so the
attempt genuinely never completed) and by timing routes before/after a
clean restart (20s+ → under 1s). Restarting fixed the symptom. Hardened
the action anyway since Supabase latency in this environment is high even
when "healthy" (§6): the two file uploads now run in parallel
(`Promise.all`), and the organization-insert-through-application-insert
sequence is wrapped in one try/catch so a genuine network-level throw
(which `supabase-js` does raise for connection failures, unlike its normal
`{ data, error }` return) surfaces as the same clean error state every
other failure path already returns, rather than an unhandled rejection.
`redirect()` deliberately stays outside that try — it throws its own
signal that must reach Next.js's handling, not get caught here.

Also in this PR, unrelated to the hang: `components/PasswordField.tsx`
(show/hide toggle) wired into `/login`, `/signup`, `/staff/login`; a
"Forgot password?" flow added to staff login only
(`/staff/login/forgot-password` → `/staff/login/reset-password`, standard
Supabase `resetPasswordForEmail`/`updateUser`, doesn't touch MFA). The
issuer/applicant side (`/login`) doesn't have the same forgot/reset flow
yet — `docs/sitemap.md` already documents generic `/forgot-password`/
`/reset-password` routes for it if that's wanted later.

---

## 15. Where things stand right now

Dev server was left running at `http://localhost:3000` (freshly restarted,
not the degraded one from §6/§14) for the user's own testing. No open PRs.
Nothing has been deployed to production since the Phase 4 era (§7) — Phases
5–7 and PR #18 exist only on `main` + the hosted Supabase project.

---

## 16. Next up: Phase 8 — Trainee self-claim

Per `docs/build-phases.md`: *"On trainee creation, send a claim-link email
(Resend) with a signed, expiring token. Build the claim flow: trainee
verifies via the link, can then edit their bio, photo, contact
preferences, and open-to-hire status, or request the profile be
hidden/removed (soft-delete, not a hard delete of the underlying
certificate record). This is the NDPA compliance hook."*

**What already exists and needs no new work**: `trainees.claim_token` /
`claimed` / `claimed_by_user_id` have existed since migration `0006` but
have never been populated or read by any code yet. Once
`claimed_by_user_id = auth.uid()`, the existing `trainees_self_all` RLS
policy already lets that trainee edit their own `bio`, `photo_url`,
`contact_visibility`, and `open_to_hire` directly — **no schema or RLS
change needed for that part.** Certificate verification
(`verify_certificate()`) already reads only from `certificates`, never
`trainees.is_hidden` — so hiding a directory listing already can't affect
verifiability today, satisfying that requirement with zero new code.

**What's genuinely open — worth a decision before building, not
assuming:**

1. **Claim token expiry.** `claim_token` is a bare `text` column today,
   no expiry tracking. Recommend adding `trainees.claim_token_expires_at
   timestamptz` (a small new migration) and generating an opaque random
   token (same pattern as `lib/certificates/public-id.ts`) rather than a
   signed JWT — simpler, and consistent with how this schema already
   models the token as a plain lookup key, not a self-verifying credential.
2. **Auth linking UX.** A trainee clicking their claim link may not have a
   Certified Africa account at all. Needs a decision: does `/claim/[token]`
   prompt them to sign up/log in first (reusing `/signup`/`/login`, passing
   the token through somehow — a query param surviving the redirect, or a
   short-lived cookie) and then link the resulting `auth.users.id` to
   `claimed_by_user_id`? Recommend this over inventing a separate
   passwordless flow, to reuse the existing auth pages rather than build a
   third one.
3. **Self-hide conflicts with an existing trigger.** `trainees`'
   `guard_trainee_moderation_columns` trigger (migration `0006`) blocks
   *any* non-staff update to `is_hidden`/`flagged_reason`/`claimed`/
   `claimed_by_user_id`/`claim_token` — including from the trainee who
   owns the row via `trainees_self_all`. Blueprint's "request the profile
   be hidden" needs the trainee to flip `is_hidden` themselves. Two ways to
   resolve, pick one deliberately rather than punching a hole in the
   trigger without thinking it through:
   - **(recommended)** A dedicated server action using the service-role
     client (`createAdminClient()`) that checks `claimed_by_user_id ===
     session user id` before flipping `is_hidden` — matches this codebase's
     established "privileged column changes go through one service-role
     path with an explicit check" pattern (certificates, audit_log, jobs),
     and keeps the trigger's blanket protection intact for everything else
     (moderation flags, claim mechanics).
   - Alternative: modify the trigger to carve out `is_hidden` specifically
     as self-settable by the row's own `claimed_by_user_id`, still blocking
     `flagged_reason`/`claimed`/`claimed_by_user_id`/`claim_token`. More
     "in the database," but touches a trigger every other table's
     moderation logic also relies on reading correctly — the service-role
     action is the lower-risk option.
4. **No `audit_log` actor_type for a trainee's own action.** `actor_type`
   is currently `system`/`staff`/`issuer` (migration `0013`). A trainee
   self-hiding their profile doesn't obviously need an audit trail the way
   staff decisions or issuer revocations do (CLAUDE.md rule #7 is about
   *admin* decisions specifically) — recommend not logging it at all rather
   than adding a fourth actor_type for one low-stakes self-service action,
   but flag this rather than assume it if the next session disagrees.
5. **Claim email needs sending from two call sites.** Both the single-entry
   issuance action (`app/dashboard/programs/[id]/issue/actions.ts`) and the
   bulk processor (`lib/bulk-issuance/processor.ts`) create `trainees` rows
   — the claim-link email needs to fire from both, only when the row has an
   email address (many bulk rows won't). A new `lib/email/claim-
   templates.ts` alongside the existing `application-templates.ts`/
   `organization-templates.ts`/`contact-templates.ts` is the natural home.

**Suggested build order**: migration (claim token expiry) → claim-link
email wired into both issuance paths → `/claim/[token]` (verify + auth
link) → a claimed-trainee profile editor page (bio/photo/contact
preferences/open-to-hire, all already RLS-permitted) → the self-hide
server action. Same rhythm as every phase before it: branch off `main`,
commit incrementally, migration sent separately for the SQL Editor, PR
opened, **wait for explicit merge approval** — and given the size of the
open questions above, probably worth splitting into 2–3 items (e.g.
"claim + verify" then "profile editor + self-hide") with a review/merge
checkpoint between them, matching how Phases 5–7 were run this session.
