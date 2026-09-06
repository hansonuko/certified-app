# Session Handoff

Running record of where the build actually stands — what's live, what's
verified, what's still open. Read this alongside `docs/build-phases.md`
(the plan) before starting a new phase; this doc is the "what actually
happened" complement to that plan.

**Last updated:** 2026-09-06, after Phase 3 merged (PR #6).

---

## 1. Where things stand

| Phase | Status | PR | Notes |
|---|---|---|---|
| 0 — Foundation | ✅ merged | #1 | Next.js scaffold, Supabase schema (0001–0009), auth (issuer + staff/MFA), `lib/permissions.ts` |
| 0.5 — Super Admin Bootstrap | ✅ merged | #2 | First Admin created live: **Hanson Uko / certifiedafrica1@gmail.com** — see §4, password was changed after bootstrap |
| 1 — Applicant onboarding | ✅ merged | #3 | Identification-based (NIN dropped per explicit direction), migration 0010 |
| 2 — Staff console + application review | ✅ merged | #4 | `/staff/applications`, approve/request-info/reject, audit log, email |
| 2.5 — Organizations (partial, by design) | ✅ merged | #5 | Only `/staff/organizations` — Certificates/Revocations/Moderation/Support deferred to Phases 4/5/6, see §3 |
| 3 — Brand setup & templates | ✅ merged | #6 | Dashboard shell, brand wizard, migration 0011, real fonts, logo+signature rendering fixed on all 10 templates |
| 4 — Certificate issuance & verification | **not started** | — | Next up |

All 6 PRs merged in order, no open PRs as of this writing. `main` builds
clean (`npx tsc --noEmit`, `npm run build`) as of `7c9037c`.

---

## 2. Live infrastructure

**Supabase project**: `wvcvzeybvloamkkghckp` (hosted, not local — no Docker/
Supabase CLI in this environment, so `supabase start` was never used; every
migration was applied by hand via the Dashboard's SQL Editor).

Migrations `0001`–`0011` all applied and confirmed live. Schema covers:
`organizations`, `applications`, `training_programs`, `trainees`,
`certificates`, `admin_users`, `audit_log`, plus the `application-documents`
(private) and `org-brand-assets` (public) Storage buckets.

**First Admin**: created via `scripts/bootstrap-admin.ts` against the live
project. `ADMIN_BOOTSTRAP_SECRET` has been blanked out in `.env.local`
afterward per its own spec (docs/roles-permissions.md §4 step 3) — the
bootstrap script will refuse to run again regardless (zero-count check),
but the secret is gone too as belt-and-suspenders.

**`.env.local`** (gitignored, not committed) — what's actually filled in:

| Var | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | ✅ set, live project |
| `CERTIFICATE_SIGNING_SECRET` | ✅ set (generated locally, not yet exercised — no issuance code exists until Phase 4) |
| `ALTCHA_HMAC_SECRET` | ✅ set, verified working (real proof-of-work solve confirmed live in Phase 1 testing) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | ✅ set, but **mocked to console outside production** (`lib/email/send.ts`) — never actually sent a real email yet, by design |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ❌ **empty** — the credential given early on was a `redis://` TCP string, not the REST API URL+token these need. Nothing in the app uses Upstash yet, so this hasn't blocked anything, but it will the moment a phase needs real rate-limiting (verification endpoint, contact-reveal) |
| `ADMIN_BOOTSTRAP_SECRET` | ❌ empty (intentional, see above) |

**Not configured at all**: Google OAuth (needs a Client ID/Secret entered
in Supabase Dashboard → Authentication → Providers → Google — this isn't
an env var, so there's nothing to check into `.env.local`). The "Continue
with Google" button exists in the UI and will error if clicked; email/
password auth is unaffected.

---

## 3. Known open items (flagged along the way, not silently patched)

1. **No resubmission path yet.** `/apply` redirects anyone who already has
   an Organization straight to `/apply/status`, regardless of status. There's
   no UI for an applicant to submit a *second* Application after a rejection,
   even though `docs/blueprint.md` §3.1's "no cooldown, reapply immediately"
   decision assumes one exists. The staff review queue's "resubmitted"
   filter (Phase 2) is ready for this the moment it exists. Flagged in PR #4,
   never addressed since — worth deciding whether it's near-term or deferred.
2. **Certificate PDF font paths won't resolve server-side as-is.**
   `lib/certificates/fonts.ts` registers fonts with web-relative paths
   (`/fonts/...ttf`), which work fine for the brand wizard's live preview
   (browser-side `<PDFViewer>`) but won't resolve when actual certificate
   generation happens server-side in a Vercel function (Phase 4) — Node
   needs an absolute URL or filesystem path. Flagged back in the Phase 0
   PR, still unresolved — needs a decision in Phase 4 (build the absolute
   URL from `NEXT_PUBLIC_APP_URL` at render time, or read the `.ttf` files
   from disk via `fs`).
3. **`CertificateData` assembly gap.** `durationLabel`/`dateRangeLabel` on
   the shared certificate types have no direct column on `Certificate`
   (`docs/blueprint.md` §4) — they come from `TrainingProgram` at
   render/issuance time via a join. Worth confirming this is what Phase 4
   actually intends before building the issuance action.
4. **Phase 2.5 is intentionally incomplete.** `/staff/certificates`,
   `/staff/revocations`, `/staff/moderation`, `/staff/support` were all
   deferred — they depend on Certificates/Trainees/a public contact form
   that don't exist until Phases 4/5/6. Don't be surprised these routes
   aren't in the staff nav yet; that's by design, not an oversight.
5. **Upstash is unconfigured** (see §2) — any phase that needs real rate
   limiting (verification endpoint per CLAUDE.md rule #6, contact-reveal
   per rule #5) will need the correct REST credentials first.

---

## 4. Security hygiene reminders

Several real secrets passed through this chat session directly (the user
pasted them): the Supabase DB password, service-role key, the first
Admin's password, and a couple of test-account passwords (all test
accounts were deleted after use). None of the real ones have been rotated
as of this writing. Worth rotating the DB password and Admin password at
some natural pause point, purely as hygiene — not urgent, but flagged
repeatedly during the session and not yet acted on.

---

## 5. Patterns established — follow these, don't reinvent

- **Three-layer permission enforcement** (docs/roles-permissions.md §3):
  Supabase RLS (DB), `lib/permissions.ts`'s `can(role, action)` (server
  code), nav-item visibility (UX only). All three, every staff route.
- **`audit_log` and `certificates` have no RLS write policy for anyone,
  including Admin.** Every write to either goes through
  `lib/supabase/admin.ts` (service role) from a server action, after a
  `can()` check — never a direct RLS-gated client write. This is
  deliberate (supabase/migrations/0007, 0008) — don't add a policy to
  "simplify" a future phase without re-reading why.
- **Column-level restriction is views, not RLS** (RLS is row-level only).
  See `organizations_finance_view` / `organizations_public_view` /
  `trainees_public_view` in migration 0009, and the file-header comment
  there explaining why `security_invoker` must stay off.
- **Certificate verification is a function, not a view**
  (`verify_certificate` in 0009) — deliberately no selectable view onto
  `certificates` for anon, so there's no "list all certificates" path.
- **Shared react-pdf components**: `GoldSeal`, `VerificationQr`,
  `Signature`, `IssuerLogo` — every template consumes these rather than
  hand-rolling the same element 10 times. If a template needs a new
  shared visual element, add it here, not inline per-template.
- **Email is mocked outside production** (`lib/email/send.ts`) — don't
  "fix" this to always send; it's intentional per CLAUDE.md's free-tier
  discipline.
- **Bootstrap-admin's guard logic lives in a separate pure file**
  (`scripts/bootstrap-admin-guard.ts`) specifically so it's unit-tested
  without a live Supabase project. Follow this split for any future
  script with a similar "refuse unless X" gate.

---

## 6. Environment quirks worth knowing before you hit them

- **Turbopack dev-server cache corruption**: `npm run dev` occasionally
  panics on `app/globals.css` with a native process crash
  (`0xc0000142`). Fix is always the same: stop the server, `rm -rf .next`,
  restart. Happened three separate times this session, same fix each time.
- **Stray dev-server processes**: this machine runs multiple Next.js
  projects. Before assuming port 3000 is free or killing a process,
  check `Get-CimInstance Win32_Process -Filter "name='node.exe'"` and
  confirm the command line actually points at `certified-app` — don't
  kill node processes belonging to other projects.
- **Browser-automation coordinate clicks were unreliable this session**
  (viewport size seemed to fluctuate between screenshots, causing
  pixel-coordinate clicks to miss). `find` + ref-based clicks worked
  inconsistently too. What reliably worked: locating the element, then
  clicking via `javascript_tool` (`element.click()` in-page). Prefer that
  for anything that matters (form submits, template switches) rather than
  trusting a screenshot-derived coordinate.
- **Bash heredoc/`-m` commit messages with backticks get mangled** — a
  backtick-quoted code snippet inside a `git commit -m "..."` string gets
  interpreted as command substitution by the shell (see commit `378c063`,
  which lost one inline code reference this way). Use `git commit -F
  <file>` for any multi-line message containing backticks.
- **Next.js 16 renamed Middleware to Proxy** (`middleware.ts` →
  `proxy.ts`, function name `middleware` → `proxy`) — already migrated
  (`proxy.ts` at the repo root), just noting it in case a future
  dependency bump reintroduces the old convention somewhere.
- **Google's font repo only ships variable fonts now** for Playfair
  Display/Inter — registering those directly with react-pdf silently
  drops weight variation (see §3 item 2's neighbor, fixed in Phase 3).
  If any future font gets added, instantiate static weights with
  `fonttools varLib.instancer --update-name-table` first — don't assume a
  downloaded variable font "just works" with react-pdf without checking
  the rendered PDF's `/BaseFont` names.

---

## 7. Next up

**Phase 4 — Certificate issuance & verification** (`docs/build-phases.md`).
Read that phase's prompt in full before starting; check §3 items 2 and 3
above first, since both bear directly on how issuance should be built.
