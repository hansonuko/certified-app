# Launch checklist

Things deliberately deferred rather than done now, with the reason why,
so they don't get lost. Not a duplicate of `docs/session-handoff.md`'s
"still open" lists (that doc tracks the fuller day-to-day technical
backlog) — this one is specifically for items explicitly held back for a
later, deliberate pass. Check this before any real production launch.

---

## Blocked on the hosting/domain decision

The user is weighing a **Vercel → Netlify** move, and the site isn't yet
on its real custom domain (still `certified-app-lime.vercel.app`). Several
things below are genuinely host/domain-bound — doing them now against a
host and domain that might not be final risks a second pass later. See
this doc's own bottom section for the fuller reasoning on why this is a
sound call, not just caution for its own sake.

### 1. Flutterwave webhook setup
**Why it matters:** virtual-account bank-transfer payments (`lib/payments/
flutterwave-virtual-accounts.ts`) can *only* confirm via this webhook —
there's no polling fallback for that method. Card/mobile money/USSD/Opay/
bank_account all still work without it (they resolve via the billing
callback page's own `getCharge()` poll), just less resiliently.

**What's needed, once the domain is final:**
1. Flutterwave dashboard → Settings → Webhooks → set the URL to
   `https://<final-domain>/api/webhooks/flutterwave`.
2. Copy the **Secret Hash** Flutterwave shows there.
3. Set it as `FLUTTERWAVE_WEBHOOK_SECRET_HASH` in the host's production
   env vars (Bash `printf`, not PowerShell piping — see
   `docs/session-handoff.md` §22 for why that matters for anything that
   becomes a stored secret).
4. Redeploy.
5. Verify with a real webhook delivery (the dashboard's own "send test
   webhook" button, or a real payment attempt).

**Good news:** the code and the secret itself are host-agnostic — nothing
here needs redoing if the host changes, only step 1's URL field. This is
a cheap follow-up edit, not a full redo.

### 2. `NEXT_PUBLIC_APP_URL`-dependent production issuance
**Why it matters, beyond the webhook:** every certificate's QR code and
`/verify/{id}` link is generated **once, at issuance time**, from
whatever `NEXT_PUBLIC_APP_URL` is set to then — and per `CLAUDE.md` rule
#4, certificates store snapshots, never live references. A certificate
issued today against `certified-app-lime.vercel.app` has that URL baked
into its QR code **permanently** — switching domains later doesn't
retroactively fix already-issued certificates unless the old domain is
kept alive as a redirect forever.

**Recommendation:** treat real (non-test) certificate issuance, not just
the webhook, as blocked on the domain being final. Test/disposable
issuance against the current Vercel URL is fine (it already happens
routinely per `docs/session-handoff.md`'s disposable-test-org pattern) —
just don't let real trainee certificates go out on a URL that's expected
to change.

### 3. `CRON_SECRET`
Still unset on Vercel (`docs/session-handoff.md` §2) — the bulk-issuance
cron route's auth currently no-ops. Worth setting properly as part of
whichever host's final production hardening pass, not before.

---

## Saved reminders not yet acted on

Things the user explicitly asked to be remembered/circled back to,
pulled forward from cross-session memory so they live in the repo itself
rather than only in Claude's memory store.

### Contact form → real support queue
`/contact` currently emails `SUPPORT_INBOX_EMAIL` directly
(`lib/contact/actions.ts` equivalent flow). Swap it to route into a real
`/staff/support` queue once that page exists (`docs/session-handoff.md`
§3 item 4 — `/staff/support` is still unbuilt, one of the deferred staff
moderation/support surfaces).

---

## Other genuinely pre-launch-relevant items (cross-referenced, not duplicated)

Tracked in full in `docs/session-handoff.md` — listed here only as
pointers so a pre-launch pass doesn't have to reconstruct the list from
scratch:

- Migration `0031` (`payments.provider_charge_id`) — never confirmed
  applied to the hosted project (§2). Flutterwave charge-status lookups
  depend on it.
- Migration `0035` (`application_drafts`) — never confirmed applied (§2).
- A real live Flutterwave test — card, mobile money, USSD, Opay,
  bank_account, and virtual account, one real attempt each — has never
  happened for any of them (§20, §24, §25).
- Upstash rate limiting still unconfigured — `/verify` and the contact
  relay run on in-memory limiters, fine for single-instance dev/demo,
  not real multi-instance production traffic (§2, §3 item 5).
- `/staff/revocations`, `/staff/moderation`, `/staff/support` — none of
  the staff moderation/support surfaces exist yet (§3 item 4).

---

## On the Vercel → Netlify question

See the assistant's own reasoning in the conversation this doc was
created from — short version: deferring is the right call, and the
`NEXT_PUBLIC_APP_URL`/QR-code permanence issue above is a sharper reason
for it than the webhook alone. The webhook's code and secret are portable
across hosts; what actually isn't cheap to redo is real certificates
already carrying today's URL. Decide hosting + domain first, then do one
clean production-readiness pass against the final answer, rather than
partially hardening against Vercel now and re-hardening against Netlify
later.
