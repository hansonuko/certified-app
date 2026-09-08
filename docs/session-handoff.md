# Session Handoff

Running record of where the build actually stands — what's live, what's
verified, what's still open. Read this alongside `docs/build-phases.md`
(the plan) before starting a new phase; this doc is the "what actually
happened" complement to that plan.

**Last updated:** 2026-09-08 — this doc had fallen behind `main` by nine
merged PRs before this update (§20–22 above still described Monetization
Flow A as "not yet a PR" long after it, and everything through PR #53, had
actually shipped) — corrected here, then this session's own work (Flutterwave
multi-method payments, §24) added on top. In order: **PR #44** merged Flow A
itself (§20); **PR #45** was a docs-only handoff update; **PR #46** built
staff wallet management (§21); **PR #47** was another docs-only update plus
the first production redeploy with live payment credentials (§22); **PR #48**
made Wallets its own staff sidebar nav item; a direct-to-main guard-trigger
security fix (service-role calls were being wrongly blocked by the same
owner-write guard `0030` added — see §23) landed alongside **PR #50**, which
also added `/apply` save-and-continue-later and made the sitewide "become an
issuer" CTAs status-aware; **PR #51** added organization/issuer search to the
public directory; **PR #52** hid those same apply CTAs sitewide for anyone
who's already applied; **PR #53** added a light/dark theme toggle to both
dashboard shells. See §23 for the consolidated recap of #46–53 (§21's own
entry already covers #46 in full). **This session**: Flutterwave's checkout
was card-only — added mobile money, USSD, and bank transfer as real
alternatives, branch `flutterwave-multi-method-payments`, **PR #54, not yet
merged** — see §24. `main` builds clean (`tsc`, `npm run build`, `npm test` —
20/20) as of `4a93fe9` (PR #53); PR #54's branch builds equally clean on top
of it.

---

## 20. Monetization Flow A — certificate credits (branch `monetization-flow-a-certificate-credits`, pending review)

Picked up from a direct user request (not a `docs/build-phases.md` phase that existed before this session): the platform's first real monetization. Scoped as three flows in one conversation — org pays per certificate issued (Flow A), a Premium subscription unlocking custom templates (Flow B), trainee-paid contact-unlock (Flow C) — but **only Flow A was approved to build**; Flows B and C are scoped (docs/build-phases.md Phase 11 items 2–3, docs/blueprint.md §11.9's "Next to Decide") but not started. Full scoping conversation and the design decisions it produced are captured in Phase 11 of `docs/build-phases.md` — this section is the "what was actually built" complement to that.

**What shipped:**
- **Migration `0030_certificate_credits.sql`**: `organizations.certificate_credits` (cached balance) + `certificate_credit_transactions` (the ledger — source of truth), `payments` (one row per checkout attempt, provider-agnostic via a `purpose` column), `certificate_credit_pricing_tiers` (admin/finance-editable discount tiers — 1 credit 0%, 2–19 at 30%, 20+ at 50%) and `payment_currency_rates` (NGN-anchored, admin/finance-editable, seeded with **placeholder rates flagged as needing verification**, no live FX feed). Three `SECURITY DEFINER` functions (`spend_certificate_credit`, `refund_certificate_credit`, `add_certificate_credits`) are the only path anything mutates the balance through — extended the existing owner-write guard trigger (`guard_organization_status_columns`, hardened for AM-assignment in #37) to also block `certificate_credits`, proactively applying the exact lesson that trigger's own history already flagged rather than waiting for a follow-up security-fix PR. **Not yet applied to the hosted Supabase project** — needs hand-pasting into the SQL Editor same as every migration before it, then the usual disposable-test-account verification pass, before this can be exercised live.
- **`lib/payments/`** (new): `provider.ts` (interface), `flutterwave.ts`/`paystack.ts` (adapters — plain `fetch`, no new npm dependency), `pricing.ts` (tier lookup + server-side quote computation — price is *always* computed from quantity server-side, never trusted from the client), `currency.ts` (NGN → local-currency resolution), `credits.ts` (thin RPC wrappers), `confirm.ts` (the shared "apply a confirmed payment" logic — idempotent, checks the provider's reported amount/currency against what checkout was created for before crediting anything, same "one function, two triggers" shape as `lib/bulk-issuance/processor.ts`'s `advanceJob()`).
- **Issuance gating**: `lib/certificates/issue.tsx`'s `issueCertificate()` — the one function both single-entry and bulk issuance already call — now spends one credit atomically before rendering anything, and refunds it if the certificate ultimately fails to get created (a hard DB error or a render/upload exception), so a failed attempt never costs a credit. Both `/dashboard/programs/[id]/issue` and `/dashboard/programs/[id]/bulk-issue` show the current balance and a clear "top up" prompt when it's zero.
- **`/dashboard/billing`**: real page now (was the "You're on the Free plan" placeholder) — balance, tiered pricing table, quick-buy (1/10/20/50) + custom-quantity top-up form with a Flutterwave/Paystack choice, recent ledger activity. **`/dashboard/billing/callback`** (new): post-checkout landing page that confirms the payment itself as a fallback if the webhook is slow/absent — same resilience pattern as the bulk-issuance job status page's opportunistic `advanceJob()` call.
- **`/staff/finance/billing`**: real pricing/currency config now (was the "no paid plans yet" placeholder) — live-editable discount tiers and currency rates (the user's explicit ask: adjustable "at any given time," not a code constant), each edit audit-logged, plus all-time credits-sold/revenue stats and the pre-existing plan-distribution table, unchanged.
- **`app/api/webhooks/{flutterwave,paystack}`** (new): signature-verified (rejects anything that doesn't check out before touching the payload), idempotent, delegate to `lib/payments/confirm.ts`.
- **`CLAUDE.md` rules #11–12** (new, non-negotiable): org registration/KYC/approval free forever, payment secrets/webhook verification held to the exact same discipline as the certificate-signing secret (rule #3), certificate credits mutated only via the dedicated functions.
- **`docs/blueprint.md`** §4 (data model), §10 (Deferred — "paid tiers for issuers" now partially begun), §11 (new confirmed-decision #9); **`docs/roles-permissions.md`** (a note that `manage_billing` now has real substance); **`docs/sitemap.md`** (both billing pages' descriptions); **`app/(marketing)/pricing`** (rewritten — the old copy promised "$0/month, nothing moves behind a paywall retroactively," which Flow A would have made false; now states registration/approval stay free forever and certificate issuance costs ₦1,000/credit with the same tiers, flagged as an important consistency fix rather than left stale).

**Verified:** `npx tsc --noEmit`, `npm run build`, `npm test` (20/20) all clean. **Not yet verified against the hosted Supabase project** (migration not yet applied) and **not yet tested against real Flutterwave/Paystack sandbox checkouts** — both are the natural next steps once the migration is pasted in, following the same disposable-test-org verification pattern every prior phase used.

**Still open, not silently dropped:**
1. ~~Migration `0030` needs to be applied~~ — **done**, user applied it directly to the hosted project (2026-09-08).
2. ~~Sandbox keys aren't in `.env.local`~~ — **Paystack done** (real TEST keys, `sk_test_.../pk_test_...`, added to `.env.local`, connectivity-verified — see below). **Flutterwave hit a real architecture wall**, see next point.
3. **Flutterwave v4 — built, but genuinely unverified against any real endpoint.** The credentials provided are v4 and **live**. `lib/payments/flutterwave.ts` was originally written against v3 (a static secret key, hosted checkout link) — real credentials surfaced that v4 is architecturally different: OAuth2 client-credentials auth (confirmed live — a real token fetch succeeded), and **no hosted-checkout/payment-link endpoint at all** as of this date. User chose, explicitly and knowing the risk, to build the real v4 integration rather than fall back to Paystack-only or wait for sandbox keys:
   - **What was built**: `lib/payments/flutterwave-crypto.ts` (AES-256-GCM field encryption, matching Flutterwave's documented algorithm exactly — key import, 12-char nonce as raw IV bytes, tag auto-appended by SubtleCrypto), `lib/payments/flutterwave.ts` rewritten for v4 (OAuth token fetch+cache, `createDirectCharge()` via the single-call orchestrator endpoint, `getCharge()` for status lookup, v4's webhook signature model — `flutterwave-signature` header, HMAC-SHA256, different from v3's plain shared-secret comparison). Card details are collected on our own page (`BuyCreditsForm.tsx`'s Flutterwave branch — number/expiry/CVV/optional name) and encrypted **server-side, immediately on receipt** (`initiateFlutterwaveCharge` in `app/dashboard/billing/actions.ts`) — never logged, never persisted, discarded from memory right after the charge request is built. Migration `0031` adds `payments.provider_charge_id` (v4 has no "verify by our own reference" endpoint, only `GET /charges/{id}` by Flutterwave's own id). The redirect-for-3DS path reuses the same "redirect out, redirect back, confirm" shape as Paystack via the billing callback page (now branching per provider — `confirmFlutterwaveChargeByReference` vs. `confirmPaymentByReference`, both funneling into the same shared, amount/currency-checked `applyConfirmedSuccess`). PIN/OTP-required charges (a documented `next_action.type === 'authorize'` case) are **deliberately not handled** — surfaces a clear "try a different card" error rather than guessing at an unverified request schema for that step.
   - **What was verified, safely, without spending real money**: (1) OAuth token issuance against the live credentials — succeeds. (2) The encryption helper's own round-trip (encrypt then manually decrypt with the same primitives) — matches the original plaintext, key decodes to exactly 32 bytes as AES-256 requires. (3) `tsc`/`build`/`test` all clean. **Never attempted**: an actual `createDirectCharge()` call against Flutterwave's live API — no sandbox credentials were available, and testing against live risked either a real charge or an unpredictable effect on the live merchant account's fraud signals, so this was deliberately left untested end-to-end rather than rushed. **This is a materially different confidence level than everything else in this session** (which always had at least a safe live-connectivity check) — flagging plainly rather than presenting it as equally solid.
   - **Recommend before this ever serves real traffic**: get Flutterwave sandbox/test-mode credentials and run at least one real test charge through the full flow (including the 3DS redirect round-trip) before removing the "written but unverified" caveat.
4. **Paystack — fully live-verified (safe, zero money moved, test mode).** `createCheckout` returned a real `checkout.paystack.com` URL; `verifyTransaction` on the unpaid reference correctly read back a non-success status. This remains the higher-confidence, battle-tested path of the two.
5. `payment_currency_rates`' seeded GHS/KES/ZAR/USD rates are still explicitly placeholder values (the migration's own comment flags this) — worth a real check before relying on them for an actual non-Nigerian charge.
6. Flows B and C (docs/build-phases.md Phase 11 items 2–3) are scoped, not built — Flow B in particular un-defers `docs/blueprint.md` §10's custom-certificate-upload feature, which is real net-new scope, not just a payment gate.
7. Not deployed — this is on a feature branch, not merged to `main` yet, let alone redeployed to Vercel.

---

## 21. Staff wallet management + confirmation-path hardening (user request: "build the admin wallet properly")

Picked up directly from the user, right after Flow A's merge, asking for the wallet-crediting side to be built to a proper standard so a real payment reliably shows up on the org's balance. Three migrations (`0032`–`0033`, not yet applied to the hosted project — needs the same SQL Editor treatment as every migration before it) plus code:

- **`/staff/finance/wallets`** (new, Admin + Finance, `manage_billing`): every organization's certificate-credit balance, searchable; click through to `/staff/finance/wallets/[id]` for the full ledger (last 50 transactions) and a **manual credit/debit adjustment** form (goodwill refund, correcting a support-desk error) — the first thing to actually use the `manual_adjustment` ledger type that had sat in `certificate_credit_transactions`' check constraint since `0030` with no function ever writing one. Migration `0032` adds `adjust_certificate_credits_manual()` (same "one privileged function, no direct write" pattern as the other two), migration `0033` appends `certificate_credits` to `organizations_finance_view` (Finance can't read the base `organizations` table directly, same reason that view exists at all). Every adjustment writes an `AuditLog` row.
- **A "stuck pending payments" review queue** on the wallets list page — payments sitting `status = 'pending'` for 15+ minutes, the practical signature of "neither the webhook nor the payer's own callback-page visit confirmed this." Gives staff a concrete place to notice a payment that didn't auto-credit and manually fix it via the adjustment form, rather than it silently going unnoticed.
- **A real correctness fix in `lib/payments/confirm.ts`**: `applyConfirmedSuccess`'s amount/currency-mismatch guard used to return `status: 'failed'` — which would tell a payer "payment failed" on a **real, successful** charge that happened to trip a false-positive mismatch (a real risk given Flutterwave v4's amount-format assumption, §20, was never live-verified), risking them paying a second time while the first charge sits uncredited. Now returns a distinct `'mismatch'` status with honest copy ("we couldn't automatically confirm this — don't pay again, contact support") on the billing callback page, and the payment row correctly stays `pending` (not `failed`) so it surfaces in the new stuck-payments queue above rather than being silently mismarked.

**Verified:** `tsc`/`build`/`test` all clean. **Not yet verified against the hosted project** — migrations `0032`/`0033` are pasted-and-run by the user, not yet applied as of this writing.

**Still open:**
1. Migrations `0032`/`0033` need applying, then the usual disposable-test pass (a manual adjustment actually lands in the ledger and updates the cached balance; the stuck-payments query actually surfaces a deliberately-aged test row).
2. The 15-minute staleness threshold is a judgment call, not a documented standard — worth revisiting once real payment volume gives a sense of normal webhook/callback latency.
3. Everything from §20 (Flutterwave's charge call never fired against any real endpoint, the units-format assumption behind it, sandbox testing still recommended) is unchanged by this section — this hardens what happens *if* something doesn't auto-confirm, it doesn't replace an actual live test.

---

## 22. Production redeploy with live payment credentials

User confirmed migrations `0032`/`0033` applied, merged PR #46, and asked to see it live — this section covers that redeploy, not a new feature.

**Vercel production env vars added**: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `FLUTTERWAVE_CLIENT_ID`, `FLUTTERWAVE_CLIENT_SECRET`, `FLUTTERWAVE_ENCRYPTION_KEY` (Production + Preview both). `FLUTTERWAVE_WEBHOOK_SECRET_HASH` intentionally left unset — no Flutterwave webhook is configured on the dashboard yet, and the webhook route already fails closed (rejects everything) when it's unset, which is the correct behavior until that's set up.

**A real bug caught and fixed before it could bite**: the first pass of adding these vars used PowerShell's `"string" | npx vercel env add ...` piping — PowerShell writes string-literal pipeline input to a native process's stdin with a **UTF-8 BOM prefix**, silently prepending an invisible byte sequence to the value. Caught on `NEXT_PUBLIC_APP_URL` specifically (the one var stored as readable `Config` type, not write-only `Secret`) by pulling it back and hex-dumping it — confirmed the BOM was there. Since the four Flutterwave/Paystack vars added the same way are stored as `Secret` type and **can't be read back at all**, there was no way to spot-check them the same way — the only safe fix was to delete and re-add all of them via Bash `printf` instead (which doesn't add a BOM), rather than assume they were fine. A BOM-corrupted `FLUTTERWAVE_CLIENT_SECRET`/`FLUTTERWAVE_ENCRYPTION_KEY` would have failed OAuth/decryption in a confusing way (wrong-looking "invalid credentials" errors with technically-"correct" values) — worth remembering for any future "pipe a secret into a CLI via PowerShell" moment in this environment: **use Bash `printf`, not PowerShell string piping, for anything that becomes a stored secret**, especially write-only ones you can't verify afterward.

**Deployed and smoke-checked**: `npx vercel --prod` (one transient `fetch failed` on the first attempt, succeeded on retry — not a config issue, just a flaky upload). `/`, `/login`, `/staff/login`, `/verify`, `/pricing`, `/dashboard/billing` all return 200 on `https://certified-app-lime.vercel.app`. This is the first production deploy since the Phase 4 era (§7) — everything from Phase 5 through this Flow A wallet work is now live, not just on `main` + hosted Supabase.

**Still open:**
1. The actual live Flutterwave charge test (§20) still hasn't happened — this redeploy makes it possible to do from production, not a substitute for it.
2. `CRON_SECRET` still isn't set on Vercel (unchanged from every previous update) — the bulk-issuance cron route's auth still no-ops.
3. `FLUTTERWAVE_WEBHOOK_SECRET_HASH` needs setting once a webhook is actually configured on the Flutterwave dashboard — until then, the billing callback page's fallback verify is the only confirmation path for Flutterwave payments (works fine on its own, per §20/§21's design, just worth knowing webhooks aren't live yet).

---

## 23. Wallets nav visibility, a guard-trigger bug, apply/CTA cleanup, directory org search, dashboard theming (PRs #47–53)

This doc went stale here — these landed in an earlier session and were never written up, discovered only by diffing `main` against this file's own "still open" claims before the update above. Recapped from each PR's own (good) commit messages rather than re-verified fresh, since the underlying work already carries its own verification notes:

- **PR #47** (`docs-production-redeploy-payments`, docs-only): the production redeploy with live Paystack/Flutterwave credentials — this is §22 above, which *was* written up correctly at the time, just never had its "last updated" summary kept current afterward.
- **PR #48** (`staff-nav-wallets-visible`): `/staff/finance/wallets` (§21) was only reachable as a link inside the Finance overview page — `lib/staff-nav.ts` now lists **Wallets** as its own top-level sidebar item, same Admin+Finance (`manage_billing`) gate as Finance itself.
- **A real bug, fixed direct-to-main alongside PR #50**: `guard_organization_status_columns()` (added by migration `0030` to stop an org self-crediting `certificate_credits`) checks `is_staff()`, which reads `auth.uid()` from the request JWT — but every credit-mutating function (`spend_certificate_credit`, `refund_certificate_credit`, `add_certificate_credits`, `adjust_certificate_credits_manual`) is only ever invoked via the **service-role** client, which carries no user JWT. `is_staff()` was unconditionally `false` there, so the trigger had been silently rejecting every one of these calls since `0030` shipped — caught live via a disposable test org (`adjust_certificate_credits_manual` threw the trigger's own exception). Migration `0034` adds a service-role exemption, matching how `certificates`/`audit_log`/`jobs` already trust the service-role client without an equivalent trigger blocking it. **Practical implication for everything in §20–22**: certificate-credit crediting/spending/refunding may not have actually been working at all between `0030` shipping and `0034` being applied — worth a fresh disposable-test-org pass on the credit functions specifically if that window matters.
- **PR #50** (`fix-apply-payments-cta`, three commits): `/apply` gained **save-and-continue-later** — a new `application_drafts` table (migration `0035`, owner-only RLS, no staff visibility — a draft isn't a review construct), autosaved on every wizard step transition, with documents uploaded to the draft immediately (a resumed session can't repopulate a file `<input>`). Also made the sitewide "become an issuer" CTA (`components/ApplyStatusCallout.tsx`, in the footer) auth/status-aware — it had been static on every page regardless of whether the visitor already had a pending/rejected application or was an approved issuer, and the homepage/`for-businesses` pages each additionally hardcoded their own near-identical version, producing a visible "same heading twice" duplication now removed.
- **PR #51** (`directory-organization-search`): before this, an approved organization had no discoverable listing at all — `/directory` only ever searched trainees. New `/directory/organizations` page searches `organizations_public_view` by name/bio/training-fields/location, with real SQL-level range pagination and an exact count (unlike the trainee directory's in-memory-slice approach). New shared `DirectoryTabs` component and `lib/directory/sanitize-search-term.ts` (extracted from the trainee search's existing sanitizer rather than duplicated). Live-verified against the hosted project with a disposable approved test org.
- **PR #52** (`dynamic-apply-cta-sitewide`): PR #50's footer fix turned out to be one of several places still unconditionally telling every visitor to apply, including an already-approved signed-in issuer — the homepage's CTA card, `/pricing`'s apply button, `/about`'s apply button, `/how-it-works`' entire "Ready to get started?" section, and `for-businesses`' header subtitle all got the same status-aware treatment via a new shared `components/ApplyCtaButton.tsx`. Live-verified against the hosted project with a real approved test org.
- **PR #53** (`dashboard-theme-toggle`): `components/ThemeToggle.tsx` existed only in the public site header — neither dashboard shell (`IssuerShell.tsx`/`StaffShell.tsx`) could switch themes, even though the global no-flash bootstrap script already covered every route including dashboards. Added to each shell's top bar next to sign-out, reusing the same component. Sidebars deliberately keep their fixed navy/slate branding regardless of theme (identifies which console you're in, not a themeable "surface").

**Verified** (per each PR's own commit message): `tsc`/`build`/`test` (20/20) clean throughout; the guard-trigger fix's and #51/#52's live-verification claims are as stated above, not independently re-checked in this update.

**Still open, carried forward**: everything from §20's Flutterwave list (still genuinely untested against any live endpoint even after §24's multi-method work below — see that section), `CRON_SECRET` unset on Vercel, `FLUTTERWAVE_WEBHOOK_SECRET_HASH` unset, migrations `0034`/`0035` need the usual hosted-project hand-paste + disposable-test verification (flagged with extra urgency above given `0034`'s bug), and **everything from PR #48 onward (`main` at `4a93fe9`) has not been redeployed to production** — the last confirmed-live deploy is still the one in §22 (through PR #46/#47).

---

## 24. Flutterwave multi-method payments (branch `flutterwave-multi-method-payments`, PR #54, pending review)

Picked up from a direct user request: Flutterwave's checkout was card-only — quite literally labeled "Flutterwave (card)" in the UI (§20) — while Paystack gets card/bank-transfer/USSD "for free" via its own hosted checkout page. Added the other v4 direct-charge payment methods so Flutterwave is a real second option, not a second card processor. Also cleaned up the two now-superseded local/remote `docs-session-handoff-*` branches this session started from (see this update's own header) — `docs-session-handoff`/`-2`/`-3` were already merged (routine local cleanup), `docs-session-handoff-4` and `docs-session-handoff-nav-and-redeploy` were stale, unmerged, and fully superseded by what actually landed in `main` (confirmed via `git diff` against each before deleting, not assumed) — deleted locally; remote deletion was denied by the environment's own permission classifier as an outward-facing action, so those two still exist on `origin` for the user to remove if wanted.

**What shipped:**
- **`lib/payments/flutterwave.ts`**: `DirectChargeParams`'s hard-coded `card` field replaced with a discriminated `FlutterwavePaymentMethod` union (`card` / `mobile_money` / `ussd` / `bank_transfer`) — `createDirectCharge` now builds the request's `payment_method` body per type instead of always emitting `type: 'card'`. A new `pending_instructions` outcome carries USSD's dial code, mobile money's "approve on your phone" prompt, or bank transfer's generated virtual-account details back to the caller (Flutterwave's `next_action.type` values `payment_instruction`/`requires_bank_transfer`, researched fresh against developer.flutterwave.com since nothing in-repo had ever modeled non-card methods). A mobile money network that responds with `qr_code` confirmation (a real, documented v4 outcome) is declined with a clear message, same "flag rather than guess" reasoning already applied to card's unsupported PIN/OTP case.
- **A real correctness fix surfaced by this work**: `parseWebhookEvent` was mapping *any* non-`'success'` status to `'failed'`, including an intermediate `'pending'`. Harmless for card (resolves mostly synchronously via redirect), but a real risk for the three new async methods, which have a genuine multi-minute "waiting on the payer" window — an intermediate pending webhook could have wrongly flipped a payment to `failed` before the payer even finished dialing/transferring. Now only `success`/`failed`/`cancelled`/`expired` produce an event; anything else is ignored, leaving `confirmFlutterwaveChargeByReference`'s own `getCharge()` poll (billing callback page) as the resolution path, same as before this fix for any status it didn't recognize.
- **`lib/payments/flutterwave-options.ts`** (new): the one source of truth for mobile money networks (Ghana MTN/Vodafone/AirtelTigo, Kenya M-Pesa — the only two non-NGN currencies this app already bills in, `lib/payments/currency.ts`) and Nigerian USSD bank codes (10 major banks) — used by both `BuyCreditsForm.tsx`'s `<select>`s and the server action's own validation, so a tampered/stale client value is rejected server-side rather than trusted.
- **`app/dashboard/billing/actions.ts`**: `initiateFlutterwaveCharge` now dispatches on a `flutterwave_method` field instead of always reading card fields, validates each method's fields against the option lists above, and cross-checks mobile money/USSD against the org's own server-computed billing currency (not the client's method choice) before ever calling Flutterwave.
- **`app/dashboard/billing/BuyCreditsForm.tsx`**: a "Pay via" selector nested under Flutterwave (Card / Bank transfer always shown; USSD only for Nigerian orgs; Mobile money only for Ghana/Kenya orgs), with a per-method sub-form. Once an async charge returns `pending_instructions`, the form is replaced entirely by an instructions panel (not just an error message) — deliberately prevents a stray resubmit from firing a second charge for the same top-up while the first is still in flight.
- **`supabase/migrations/0036`**: additive `payments.payment_method` column (card/mobile_money/ussd/bank_transfer, null for Paystack) — for support/reconciliation only, nothing downstream reads it yet. **Not yet applied to the hosted project.**

**Verified:** `npx tsc --noEmit`, `npm run build`, `npm test` (20/20) all clean. Dev server started (`npm run dev`, clean `.next` rebuild) and left running for the user's own manual testing.

**Not verified, flagged plainly rather than presented as more solid than it is:** exactly the same caveat as the original card flow (§20) — this is written faithfully against developer.flutterwave.com's current v4 reference docs (`payment-orchestrator-flow`, `payment-methods`, `bank-transfer`), but **no sandbox credentials have ever been available for this integration**, so **none of the four payment methods, card included, have ever been exercised against a live Flutterwave endpoint**. The bank-transfer request shape in particular (`type: 'bank_transfer'`, a `pwbt: { account_type: 'dynamic' }` object) was the least consistently documented of the three new methods across Flutterwave's own pages during research — worth the closest look in a real sandbox pass.

**Still open:**
1. A real sandbox-credentialed test pass — one per payment method, not just card — before any of this serves real traffic, per §20's existing recommendation, now with three more methods needing the same treatment.
2. Migration `0036` needs the usual hosted-project hand-paste.
3. Not merged — **PR #54 is open, waiting on explicit merge approval**, per usual. Not deployed.
4. Everything else from §20/§23's still-open lists (Flutterwave webhook secret unset, `CRON_SECRET` unset, migrations `0034`–`0036` all pending, PRs since #47 not yet redeployed) is unchanged by this section.

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
| 8 — Trainee self-claim | ✅ merged | #20, #21 | Claim+verify, then profile editor+self-hide. See §16 |
| — Public marketing site (out-of-band) | ✅ merged | #22 | 11 pages + shared public shell/nav/footer. See §17 |
| — Fix bulk-issuance cron schedule | ✅ merged | #24 | Hobby plan only allows daily crons; `*/5 * * * *` → `0 0 * * *`. Surfaced by a real deploy attempt, see §18 |
| 2.75 — Staff team management & audit log | ✅ merged | #25 | `/staff/team`, `/staff/audit-log`, `/staff/settings` — see §18. Never actually started before this |
| 9, item 1 — Finance usage dashboard | ✅ merged | #26 | `/staff/finance`. Migration 0024 |
| 9, item 2 — Finance reports | ✅ merged | #27 | `/staff/finance/reports` (CSV/PDF). Migration 0025 (needed a follow-up fix, #32) |
| 9, item 3 — Finance billing placeholder | ✅ merged | #28 | `/staff/finance/billing` |
| 9, item 4 — Operational analytics | ✅ merged | #29 | `/staff/analytics` |
| 9, item 5 — App-wide polish pass (scoped) | ✅ merged | #30 | See §18 for what was/wasn't in scope |
| — Finance's reduced `/staff/organizations` view | ✅ merged | #31 | Not one of Phase 9's 5 named items — a gap flagged since Phase 2.5 (#5), closed here |
| — Fix migration 0025 (column-order bug) | ✅ merged | #32 | See §18 |
| — Staff account deactivate + permissions matrix | ✅ merged | #34 | `/staff/team` gets a permanent one-way "Deactivate" + a read-only permissions-matrix view. Migration 0026. See §19 |
| — Account Manager org assignment + visibility restriction | ✅ merged | #35 | `organizations.assigned_account_manager_id`, round-robin auto-assignment, RLS restricts AM to assigned orgs (organizations + applications only). Migration 0027. See §19 |
| — Manual org entry | ✅ merged | #36 | `/staff/organizations/new` (Admin + AM) — same fields as `/apply`, KYC optional with staff attestation, creates pre-approved. Business/Training Centre only. See §19 |
| — Security fix: owner-writable AM assignment | ✅ merged | #37 | `#35`'s new column was missing the same owner-write guard `status`/`approved_at`/`approved_by` already had. Migration 0028. See §19 |
| — Dashboard: Directory Profile | ✅ merged | #38 | Real bio/training-fields editor + public-page preview link |
| — Dashboard: Settings | ✅ merged | #39 | Profile (read-only), password change, 2FA enroll/remove |
| — Dashboard: Help + Billing badge | ✅ merged | #40 | Help links to `/contact`/`/faq`; dropped a stale `comingSoon` badge off Billing (page was already correct) |
| — Dashboard: Messages inbox | ✅ merged | #41 | New `contact_requests` table — the contact/hire relay was email-only before. Migration 0029. See §19 |
| — Sign-out button, both dashboard shells | ✅ merged | #42 | Closed a gap flagged since #22 |
| 11, item 1 — Monetization Flow A (certificate credits) | ✅ merged | #44 | Migration `0030` applied live; `0031` (Flutterwave v4's `provider_charge_id`) needs the same treatment — see §20 |
| — Staff wallet management + confirmation hardening | ✅ merged | #46 | `/staff/finance/wallets`, manual credit/debit adjustment, stuck-pending-payments queue. Migrations 0032–0033. See §21 |
| — Wallets nav visibility | ✅ merged | #48 | `/staff/finance/wallets` promoted to its own top-level sidebar item. See §23 |
| — `/apply` save-and-continue-later + status-aware CTAs + guard-trigger fix | ✅ merged | #50 | New `application_drafts` table, migration 0035; guard-trigger service-role exemption, migration 0034 (see §23's "practical implication" note). See §23 |
| — Public directory: organization/issuer search | ✅ merged | #51 | `/directory/organizations`. See §23 |
| — Hide apply CTAs sitewide once already applied | ✅ merged | #52 | Extends #50's footer fix to homepage/pricing/about/how-it-works/for-businesses. See §23 |
| — Dashboard light/dark theme toggle | ✅ merged | #53 | Both `IssuerShell`/`StaffShell` top bars. See §23 |
| — Flutterwave multi-method payments | 🔲 open, pending review | #54 | Mobile money, USSD, bank transfer alongside card. Migration 0036 (not yet applied). See §24 |

47 PRs merged, 1 open (#54, this session's own work) as of this writing,
plus a stale unrelated docs-only PR (#23) nobody's acted on. `main` builds
clean (`npx tsc --noEmit`, `npm run build`, `npm test` — 20/20) as of
`4a93fe9` (PR #53); PR #54's branch builds equally clean on top of it.

---

## 2. Live infrastructure

**Vercel (production)**: https://certified-app-lime.vercel.app — **actually
redeployed this session** (the gap this section used to describe — "not
redeployed since Phase 4" — is closed). Deploy was blocked at first:
`vercel.json`'s Cron job (`*/5 * * * *` on `/api/cron/process-bulk-
issuance`) is rejected outright on Vercel's Hobby plan, which only allows
crons that run once a day — fixed to `0 0 * * *` (#24) before the deploy
would go through at all. `CRON_SECRET` being unset on the Vercel project
(noted here previously) is still true and still worth fixing before relying
on the cron firing for real, but it no longer blocks deployment itself.
Everything through PR #30 (all of Phase 9 + the polish pass) is on
production as of this writing; **everything since (#31–#42 — the Finance
org view, the whole staff-tooling batch, all five dashboard fixes, sign-
out) is merged to `main` but not yet in a fresh deploy** — redeploying is a
separate, explicit step per `CLAUDE.md`'s free-tier discipline, not
something that happens automatically on merge (auto-deploy-on-push is
disabled by design). Propose it, don't just do it, next time this comes up.
**Update (§22/§23):** #31–#42 *were* redeployed along with #44–#46/#47
(§22's own redeploy). **Everything from #48 onward (through #53, `main` at
`4a93fe9`) is merged but not yet in a fresh deploy** — same gap, recurring;
propose it rather than assume it next time.

**Supabase project**: `wvcvzeybvloamkkghckp` (hosted, not local — confirmed
again this session that the Supabase CLI flat out can't run on this
machine: `npx supabase start` fails immediately with "No matching Supabase
CLI binary package found for win32-x64", not just "no Docker" as earlier
sessions phrased it — there is no local-Supabase path available here at
all, full stop). Migrations continue to be hand-pasted into the hosted
project's SQL Editor by the user — see §18 for two fresh lessons learned
about that this session (the free-tier-quota style verification pattern,
and a real `CREATE OR REPLACE VIEW` column-ordering bug).

**Migrations `0001`–`0029` all confirmed applied** — `0024`–`0029` this
session (`0026`–`0029` applied by the user, then fully re-verified live —
see §19 — after this doc's previous update had already covered `0024`/
`0025`), the rest verified directly in earlier sessions via a throwaway
script querying real columns/tables through the service-role client (not
assumed from memory or from what was "sent"). `0025` needed a follow-up
fix (#32) after its first version failed live — see §18. Schema now also
covers: `organizations.assigned_account_manager_id` (0027, guarded against
owner edits by 0028), `admin_users.status`'s new `'deactivated'` value
(0026), and the new `contact_requests` table (0029) — see §19 for all
three.
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

**Update (§20–§24):** migrations `0030`–`0034` are confirmed applied (user
applied `0030`/`0032`/`0033` directly, per §20/§21; `0034`'s guard-trigger
fix is also applied, per §23). `0031` (Flutterwave `provider_charge_id`),
`0035` (`application_drafts`), and `0036` (this session's `payments.
payment_method`) have **not** been confirmed applied — flag before relying
on any Flutterwave charge-status lookup, `/apply` save-and-continue, or the
new payment-method reporting column against the hosted project.

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

---

## 17. Public marketing site (out-of-band, branch `marketing-site-public-pages`)

Phase 8 (§16 above) was the last numbered item in `docs/build-phases.md`,
but `docs/build-phases.md` never actually assigned a phase to
`docs/sitemap.md` §1's eleven public marketing pages — `app/page.tsx` was
still the literal Phase 0 placeholder ("Foundation phase — application code
starts here") the whole time, and there was no shared header/footer nav
anywhere in the app at all, on any page, marketing or otherwise. The user
asked for the full marketing site to "come live" — this PR is that, plus
the nav gap it exposed.

**What shipped:**
- All eleven pages from `docs/sitemap.md` §1: `/`, `/how-it-works`,
  `/for-businesses`, `/for-individuals`, `/pricing`, `/security`, `/faq`,
  `/about`, `/contact`, `/terms`, `/privacy` — new route group
  `app/(marketing)/`, replacing the old `app/page.tsx` placeholder.
- **The public shell** (`docs/sitemap.md` §8: "top nav — logo, How it works,
  Directory, Verify, Apply, Login" + footer) — `components/PublicShell.tsx`,
  `SiteHeader`/`SiteHeaderClient`/`SiteFooter`/`Logo`/`site-nav.ts`. Applied
  not just to the new marketing pages but retrofitted onto the other public
  surfaces via new `layout.tsx` files — `app/directory/layout.tsx`,
  `app/verify/layout.tsx`, `app/(auth)/layout.tsx` (covers login/signup/
  apply/apply-status; `callback/route.ts` is a route handler, unaffected) —
  so nav is now consistent across every page `docs/sitemap.md` groups as
  public. Header is auth-aware (`lib/auth/account-link.ts`): shows
  Dashboard/My profile/Log out once signed in, resolved by checking for an
  owned Organization vs a claimed Trainee row.
- **Fixed a real, separate gap this surfaced**: nothing in the app had a
  sign-out path before this (`lib/auth/actions.ts`'s `signOutAction` is
  new) — `components/IssuerShell.tsx`/`StaffShell.tsx` still don't wire one,
  worth a follow-up.
- **Fixed a second real gap**: `--font-sans`/`--font-display`
  (`app/globals.css`) were declared but never actually loaded in-browser —
  no `next/font`, no `<link>`, nothing — so every page had silently been
  rendering in system-ui/Georgia instead of Inter/Playfair Display since
  Phase 0. `app/layout.tsx` now loads both via `next/font/google`.
- **Homepage stats** (`docs/sitemap.md` §1: "once non-zero"):
  `lib/stats/public-stats.ts` counts `organizations_public_view` and
  `directory_listings_view` (aggregate `count: 'exact', head: true` — not a
  listing, so this doesn't reopen CLAUDE.md rule #6) and the section only
  renders once either is non-zero. Both are currently zero against local
  dev data, so the section doesn't render in normal testing — that's
  expected, not a bug.
- **`/contact`'s backend** (`lib/contact/actions.ts`'s new
  `submitPlatformContactRequest`, `lib/email/contact-templates.ts`'s new
  `platformContactEmail`): a judgment call, flagged rather than silently
  scoped down — `docs/sitemap.md` §1 says this form "routes to Account
  Manager queue," but no such queue/table exists (`/staff/support` is still
  an unbuilt future page per §7 of that doc). Built to send straight to a
  new `SUPPORT_INBOX_EMAIL` env var (`.env.example`) via the existing
  mocked-outside-production `lib/email/send.ts`, replyTo the sender — same
  relay shape as the existing trainee/org contact form
  (`components/ContactForm.tsx`), just a fixed platform recipient instead
  of a per-target one. Swappable for a real `/staff/support` queue later
  without changing the public form.
- Page-transition motion (`docs/design-system.md` §2: "fade + 8px slide-up,
  250ms ease-out") via `app/(marketing)/template.tsx` +
  `components/marketing/PageTransition.tsx`, reduced-motion respected via
  Framer Motion's `useReducedMotion()` (the CSS-level `prefers-reduced-motion`
  override in `globals.css` doesn't reach Framer's JS-driven animations,
  so this needed its own check). Same pattern in the new
  `components/marketing/FaqAccordion.tsx`.

**Verified:** `npx tsc --noEmit`, `npm test` (20/20), `npm run build` all
clean; walked every new page plus the retrofitted directory/verify/login/
terms/contact pages in a real browser — header, footer, fonts, active-nav
underline, and the FAQ accordion all render correctly. One cosmetic-only
dev console warning showed up (a hydration mismatch traced to a
`__text_mode_READY__` class landing on `<body>` before React hydrated) —
that's a browser-extension artifact per React's own hydration-mismatch
message, not something in this PR's code; didn't chase it further.

**Not done / flagged, not silently skipped:**
- `components/IssuerShell.tsx`/`StaffShell.tsx` still have no sign-out UI,
  despite `lib/auth/actions.ts` now existing — out of scope for a
  marketing-site pass, worth its own small follow-up.
- `/staff/support` (the real destination `/contact` should eventually reach)
  is still unbuilt — `docs/sitemap.md` §7 already tracked this as deferred,
  unrelated to this PR.
- Mobile-viewport testing of the new header's hamburger drawer was
  inconclusive — this session's browser automation couldn't reliably force
  a narrow viewport (`resize_window` didn't visibly change rendered layout;
  same "viewport size fluctuates" flakiness noted in §6 of an earlier
  session). The responsive classes follow the same Tailwind
  `hidden .../lg:flex` pattern already used elsewhere in the app, but a
  real-device or manual DevTools check is worth doing before treating
  mobile nav as fully confirmed.

---

## 18. Phase 2.75, all of Phase 9, a real deploy, and two migration lessons

This session picked up from a plain deploy request ("update the deploy...
because I paused the build and unpaused it") and ended up covering a lot of
ground: a first real production redeploy, the never-started Phase 2.75, all
five items of Phase 9, one flagged-but-unscoped gap Phase 9 surfaced, and
two genuine migration bugs caught by live verification rather than assumed
away. Each PR was reviewed and merged individually, in order, per the
usual rhythm — nothing here was batched into one giant PR.

**Deploy + cron fix (#24).** `npx vercel --prod` failed outright — not a
transient error — because Vercel's Hobby plan rejects any cron more
frequent than daily, and `vercel.json` (Phase 7) had `*/5 * * * *`. User
chose "once daily" over the other options (drop the cron entirely, or pay
for Pro) when asked. Fixed to `0 0 * * *`, deploy succeeded. This is also
where this doc's "Supabase CLI has no Docker" note got corrected to "no
Docker *and* no working Windows binary at all" — confirmed by actually
trying `npx supabase start` this session.

**Phase 2.75 (#25) — never actually started before this.** Caught by
checking `git log --all`/branch list before assuming Phase 9 was next,
rather than trusting the route list alone: Phase 2.5 was deliberately
partial ("by design," #5's own commit message defers Certificates/
Revocations/Moderation/Support to land alongside later phases), but Phase
2.75 (`/staff/team`, `/staff/audit-log`, `/staff/settings`) had no branch,
no commit, not even a mention in this doc's own open-items list — it had
simply fallen through the cracks. Flagged to the user before building
anything; user chose to do it first, ahead of Phase 9. Built all three
pages exactly per `docs/build-phases.md`'s own Phase 2.75 prompt — nothing
surprising here, the `admin_users`/`audit_log` schema and RLS policies
already had everything needed (the audit_log migration's own comment
literally anticipated "Phase 2.75" by name for the self-scoping policy).
Verified live with a disposable test staff account, cleaned up after.

**Phase 9, all five items (#26–30).**
- Item 1, `/staff/finance` (#26): two live metrics (Supabase DB/storage
  size, via two new `SECURITY DEFINER` RPCs — migration `0024` — because
  `.schema('storage')` is flatly unavailable through this project's
  PostgREST config, confirmed live with a `PGRST106` error before writing
  the RPC workaround), three manual-entry metrics (Resend/Upstash/Vercel —
  no live source exists for any of them in this stack, persisted to
  browser `localStorage` rather than a new DB table, a deliberate v1
  shortcut flagged in `lib/usage/free-tier.ts`'s own header comment).
- Item 2, `/staff/finance/reports` (#27): CSV/PDF export reusing
  `organizations_finance_view`/`certificates_finance_view` — both already
  existed from Phase 0 (migration `0009`) and were sitting unused. Needed
  one small migration (`0025`) to add `created_at` to the org-growth view
  for a real trend instead of a snapshot — see the migration-bug note
  below.
- Item 3, `/staff/finance/billing` (#28): a real placeholder (not static
  text) — reads `organizations_finance_view.plan` for a live
  plan-distribution count, trivial today but the right shape for real
  billing later.
- Item 4, `/staff/analytics` (#29): issuance volume, approvals/rejections,
  top training fields, geographic spread, anomaly surfacing (an org
  issuing ≥3× its own historical average). Account Manager is unscoped
  here (not "own actions only" like audit-log) — confirmed live with a
  disposable test AM account that this is actually true, not assumed from
  the permission matrix alone.
- Item 5, app-wide polish pass (#30), **deliberately scoped down** after
  asking the user rather than guessing: a literal "every clickable element,
  no exceptions" retrofit across ~50 routes was rejected in favor of
  shared infrastructure (a global `:focus-visible` fallback, a shared
  `Card`/`IconButton`) applied to the directory and both dashboard shells'
  new responsive collapse/drawer behavior. Turned out `verify/[public_id]`'s
  animated reveal and the entire marketing site were **already** fully
  compliant with `design-system.md` §2/§7/§10 from earlier sessions — real
  good news, not something this PR needed to redo. Retrofitting the ~40
  existing staff/dashboard pages' inline buttons/tables is explicitly
  **not done**, tracked as follow-up, not silently dropped.
  - Mid-PR, a stray `git checkout main -- .` briefly reverted the working
    tree back to pre-change state. Caught immediately (before anything was
    pushed) via the file-change notices the harness surfaces, fixed with
    `git reset --hard` back onto the actual commit, re-verified with a
    clean typecheck/build, confirmed `main` itself was never touched.
    Worth remembering: `git checkout <ref> -- .` checks out *that ref's*
    version of every path into the *current* working tree, regardless of
    which branch you're actually on — it's not a "make my branch match
    that ref" operation.

**Finance's reduced `/staff/organizations` view (#31, #32) — flagged, not
one of Phase 9's five named items.** While building #27, noticed
`organizations_finance_view` already existed and already gave Finance
exactly the "limited columns: name, plan, status, usage" `docs/roles-
permissions.md` §2 promised — but nothing actually let Finance reach
`/staff/organizations` at all (excluded outright since #5, "deferred to
Phase 9" per that commit's own words). Added to the task list rather than
either silently building it as a stealth sixth Phase-9 item or silently
ignoring it; built once the five named items were done. Split
`/staff/organizations` and `/staff/organizations/[id]` on `role ===
'finance'` into a reduced branch reading the finance view, full branch
unchanged for Admin/AM.

**Migration `0025`'s column-ordering bug — a real lesson, not just a typo.**
First version of `0025` put `created_at` *before* `certificates_issued` in
`organizations_finance_view`'s select list. `CREATE OR REPLACE VIEW`
compares the new column list to the old one **position-by-position** — it
only allows *appending* new columns at the end; inserting one in the
middle shifts everything after it and Postgres reads that as an attempt to
*rename* the column already sitting at that position. The user hit this
running the SQL directly: `42P16: cannot change name of view column
"certificates_issued" to "created_at"`. Fixed in #32 by moving `created_at`
to the end of the select list — no application code changes needed, since
every caller selects columns by name, never `select *`. Worth remembering
for any future view-column addition: **append only, never insert**, same
rule this codebase had already documented for *renaming* a view column
(migrations `0016`/`0017`'s drop-and-recreate approach) — this is the same
constraint, just triggered by an insert instead of a rename.

**Verification pattern used throughout, for anything hitting the hosted
Supabase project**: create a disposable test staff account (whatever role
the feature needs), sign in as it with the anon key (exactly what the real
login page does), run the actual queries/RLS paths the new code depends
on, then delete the test account and any rows it touched. This confirms
real behavior (RLS scoping, view self-filtering, graceful degradation
before a pending migration is applied) rather than trusting code review
alone — used for Phase 2.75, all of Phase 9's DB-touching items, and the
Finance org view. Every temporary verification script lived under
`scripts/tmp-*.ts` and was deleted before committing — none of them are in
the repo.

**Still open, not silently dropped:**
1. **PR #31** (Finance's reduced org view) is reviewed and ready but not
   yet merged as of this writing — the user was mid-conversation about the
   migration `0025` bug when this doc was updated.
2. **`components/IssuerShell.tsx`/`StaffShell.tsx` still have no sign-out
   UI** — flagged back in #22 (the marketing site's out-of-band PR, §17
   above), still true after this session's shell rewrite for responsive
   collapse/drawer (#30) touched both files without adding one. Small,
   real, worth a follow-up.
3. **The ~40 existing staff-console/issuer-dashboard pages' inline
   buttons/inputs/tables** were not retrofitted to the new shared `Card`/
   `IconButton` components or to a mobile stacked-card table layout —
   explicitly deferred per the scoping conversation before #30 started.
4. **`CRON_SECRET` is still not set on the Vercel project** — the cron
   route's auth check still no-ops with it unset. Doesn't block deploys
   anymore (that was the schedule-frequency issue, now fixed), but the
   cron endpoint has no real auth in production until this is set.
5. Redeploying to pick up #31/#32 (once merged) and the fresh `0024`/`0025`
   migrations is a separate explicit step, not done automatically — next
   session should ask before doing it, same as always.

**Suggested next step (superseded by §19 below — kept for history)**:
`docs/build-phases.md` Phase 10 (load-test `/verify/[public_id]` and the
contact-reveal route, a full pass against `docs/blueprint.md` §6's
loophole table confirming each mitigation is actually implemented rather
than just planned, then propose — don't just do — a production deploy on
the custom domain). Still the right call once §19's work below is
deployed and settled.

---

## 19. User-requested staff tooling, a security fix it surfaced, and all five dashboard placeholders

Picked up directly from a user request (not a numbered `docs/build-
phases.md` phase): give Admin more staff-account management, restrict
Account Manager visibility to an assigned "territory" of organizations,
let staff add organizations manually, and fix five ComingSoon dashboard
placeholders. Scoped carefully before building anything — see the four
scoping questions/answers this was built from, summarized in each PR
below — then built as five small, individually-reviewed PRs plus a
security fix the second one's own review surfaced.

**Staff account deactivate + permissions matrix (#34).** User chose
"enhance the existing 3 fixed roles" over a full custom-RBAC rewrite
(roles stay a Postgres enum, no schema/RLS redesign). Added a permanent,
one-way "Deactivate" action to `/staff/team` (migration `0026`:
`admin_status` gets a third value, distinct from suspend/reinstate and
deliberately not an actual row delete — `audit_log.actor_id` references
`admin_users`, so deleting would violate that FK or erase the audit
trail) plus a read-only permissions-matrix view (`getPermissionMatrix()`
in `lib/permissions.ts`, display-only — `can()` remains the only
enforcement path).

**Account Manager org assignment + visibility restriction (#35) — the
big one.** User chose the strict option: an Account Manager only sees
organizations assigned to them, not a softer label/filter on top of
unrestricted access; Admin stays unrestricted. Migration `0027` adds
`organizations.assigned_account_manager_id` and rewrites
`organizations_staff_all`/`applications_staff_all` (both from Phase 0/1)
via `ALTER POLICY`. Deliberately **not** extended to certificates,
trainees, or `/staff/analytics` — those stay platform-wide, matching what
Phase 9 already shipped and documented. `lib/staff/assign-account-
manager.ts` picks the assignment: round-robin by fewest-currently-
assigned among active AMs, or straight to the creator if they're
themselves an Account Manager (the manual-entry path below).

**Security fix (#37), found while building the next item.** While
building Directory Profile, noticed `organizations_owner_all` is a
blanket `for all` RLS policy — an issuer's own session could update *any*
column on their own org, not just what a dashboard form exposes. The
existing `guard_organization_status_columns()` trigger already blocked
`status`/`approved_at`/`approved_by` for exactly this reason;
`assigned_account_manager_id` (added a trigger-version later, in #35) was
missed. **Confirmed live** with a real `admin_users` id as the target (a
bogus id just hits the FK constraint and gives a false negative unrelated
to the actual gap) that an issuer could in fact rewrite their own org's
AM assignment before this fix. Migration `0028` extends the trigger.
Scoped to just this one column per discussion — `rc_number`/`legal_name`/
`plan` being similarly owner-writable post-approval is a separate,
pre-existing gap, not fixed here.

**Manual org entry (#36).** `/staff/organizations/new` (Admin + Account
Manager): same fields as `/apply`, KYC docs optional if staff attests
"verified out-of-band" with a required note, creates the org already
`approved` (one action, no separate review step). Scoped to Business/
Training Centre only — Individual Trainer needs `docs/declaration-
form.md`'s signed declaration, which only exists as inline JSX in
`ApplyForm.tsx` today; duplicating that legal text risked two copies
drifting apart, so it's flagged as a follow-up (extracting it into a
shared component) rather than done partially. Also had to provision the
owner's Supabase Auth account itself (`organizations.owner_user_id` is
`NOT NULL`, and there's no pre-existing applicant session to link to the
way `/apply` has one) — same temp-password-by-email pattern as
`inviteStaffMember`.

**Five ComingSoon dashboard placeholders, fixed (#38–#41).** User noticed
`/dashboard`'s Directory Profile, Messages, Settings, Billing, and Help
all still showed "coming soon" despite the phases they depend on
(5, 6) being done. Investigated each rather than assuming they were all
the same kind of gap:
- **Directory Profile** (#38) and **Settings** (#39) were genuinely just
  missing UI — `bio`/`training_fields` have been owner-editable at the
  RLS level since Phase 0, and profile/password/2FA all reuse Supabase
  Auth SDK calls already proven working elsewhere (staff's reset-password/
  enroll-mfa pages). No new schema for either.
- **Billing** (#40) turned out to be a false alarm — its page already
  correctly matches `docs/sitemap.md` §5's own deliberately-deferred spec
  ("You're on the Free plan" placeholder). Only the nav's `comingSoon`
  badge was stale; dropped it rather than rebuilding a page that was
  already right. **Help** (#40, same PR) just needed links to the
  already-existing `/contact`/`/faq` pages.
- **Messages** (#41) was the real exception: `lib/contact/actions.ts`'s
  relay (Phase 6) has always been email-only, nothing was ever persisted
  for an inbox to read. User chose the full fix over a read-only reminder
  page: migration `0029` adds `contact_requests` (no public INSERT policy
  at all — writes only ever happen from the vetted relay action's
  service-role client), the relay action now also persists a row
  alongside its existing email send (additive, non-fatal on failure), and
  `/dashboard/messages` is a real list + mark-read inbox. Still no in-app
  reply — replying stays over email via the relay's own `replyTo`.

**Sign-out button, both dashboard shells (#42).** `lib/auth/actions.ts`'s
`signOutAction` existed and was wired into the public site header, but
neither `IssuerShell` nor `StaffShell` ever used it — flagged since the
marketing-site PR (#22) and never fixed until asked directly. Staff gets
a separate `signOutStaffAction` landing on `/staff/login` instead of the
public homepage (a form action's signature is fixed to `(formData) =>
...` by Next.js, so this couldn't be a parameterized version of the same
function — a second small function was simpler than fighting that).

**A git mechanics note, not a code bug.** Merging #40 and #41 both hit a
real (expected, not accidental) merge conflict in `lib/issuer-nav.ts` —
four of the five dashboard-fix PRs all removed a `comingSoon: true` from
the same array, on adjacent lines, from branches that diverged before any
of them merged. Resolved both by hand (kept whichever side's line
correctly reflected that PR's own change), verified with a clean
`typecheck`/`build` after each resolution before pushing. Worth expecting
this pattern again for any batch of small, parallel PRs that all touch
the same short config-like file.

**Verification pattern, extended further this session.** Same disposable-
test-account approach as every previous phase, now covering everything
above in one consolidated post-migration pass once the user confirmed all
four migrations (`0026`–`0029`) were applied: two disposable Account
Manager accounts + two disposable orgs confirmed the AM visibility
restriction holds in both directions: `admin_users.status` accepts
`'deactivated'`; an owner's attempt to rewrite `assigned_account_manager_
id` is correctly blocked (with the fix) and the value is confirmed
unchanged afterward; a `contact_requests` row is visible to its own org's
owner and to staff, invisible to a *different* org's owner, and mark-read
works. All 10 checks passed; every piece of test data (accounts, orgs,
the test message) was deleted afterward — confirmed, not assumed.

**Still open, not silently dropped:**
1. **Not yet redeployed.** Everything in this section (#31–#42) is on
   `main`, not yet in a fresh Vercel deploy — see §2. Propose it, don't
   just do it.
2. **The ~40 existing staff-console/issuer-dashboard pages' inline
   buttons/inputs/tables** still aren't retrofitted to the shared `Card`/
   `IconButton` components from the polish pass (#30) — unchanged from
   the previous update, still deferred.
3. **`rc_number`/`legal_name`/`plan`** are still owner-writable post-
   approval with no staff-review guard (§ "Security fix" above) — a real,
   pre-existing gap, explicitly out of scope for #37's fix, not tracked
   as a numbered follow-up anywhere yet.
4. **Individual Trainer manual org entry** isn't supported (#36) —
   depends on extracting the declaration text out of `ApplyForm.tsx` into
   something shareable first.
5. **`CRON_SECRET` is still not set on the Vercel project** — unchanged
   from the previous update.

**Suggested next step**: propose (don't just do) a fresh production
deploy to pick up #31–#42, then `docs/build-phases.md` Phase 10 (load-test
`/verify/[public_id]` + the contact-reveal route, a full pass against
`docs/blueprint.md` §6's loophole table). The security-fix pattern this
session surfaced (a new owner-writable column with no guard) is also
worth a specific pass of its own before Phase 10's broader loophole-table
review — check every column added to `organizations`/`trainees` since
Phase 0 against `guard_organization_status_columns()`'s (and any
equivalent trainee-side trigger's) coverage, rather than relying on
each one being caught individually like `assigned_account_manager_id`
was.
