# Certified Africa — Internal Roles, Permissions & Super Admin Bootstrap

Three internal (staff) roles, following the standard split used across most trust/marketplace/B2B admin panels (Stripe, HubSpot, Recurly, and similar all separate "operations who can approve/moderate" from "finance who can bill/report" from "owner who configures everything") — no single non-owner role should be able to both approve issuers *and* touch money/system config.

## 1. Role summary

| Role | One-line scope |
|---|---|
| **Admin** | Full platform power. Everything Account Manager and Finance can do, plus staff account management and system configuration. |
| **Account Manager** | Trust & operations: reviews applications, manages issuer support, moderates the directory, handles revocations. |
| **Finance** | Usage/cost monitoring today; billing, invoicing, and plan management once monetization ships. No access to application review or content moderation. |

## 2. Full permission matrix

| Capability | Admin | Account Manager | Finance |
|---|:---:|:---:|:---:|
| Review & decide applications (approve / request info / reject) | ✅ | ✅ | ❌ |
| View applicant KYC documents (identification document, CAC certificate, declaration) | ✅ | ✅ | ❌ |
| View organization list (read-only, no KYC docs) | ✅ | ✅ | ✅ (limited columns: name, plan, status, usage) |
| Suspend / reinstate an organization | ✅ | ✅ (with reason, audit-logged) | ❌ |
| View platform-wide certificates & issuance data | ✅ | ✅ | ✅ (aggregate/statistical view only, not individual PII) |
| Revoke a certificate | ✅ | ✅ (with reason) | ❌ |
| Moderate directory content (hide/flag bios, photos, listings) | ✅ | ✅ | ❌ |
| Handle support/escalation queue | ✅ | ✅ | ❌ |
| View operational analytics (issuance volume, geo spread, growth) | ✅ | ✅ (read-only) | ❌ |
| View cost/usage dashboard (Supabase, Vercel, Resend, Upstash quotas) | ✅ | ❌ | ✅ |
| Manage billing, invoices, plan/pricing config (post-monetization) | ✅ | ❌ | ✅ |
| Export financial/usage reports | ✅ | ❌ | ✅ |
| Manage staff accounts (invite/create Account Manager & Finance, change role, suspend) | ✅ | ❌ | ❌ |
| Change another Admin's role or suspend an Admin | ✅ (with 4-eyes recommended — see §4) | ❌ | ❌ |
| System settings (certificate templates, rate-limit thresholds, integration keys status) | ✅ | ❌ | ❌ |
| Trigger/rotate the certificate signing secret | ✅ | ❌ | ❌ |
| View full audit log (all staff actions) | ✅ | own actions only | own actions only |
| Override another staff member's decision (e.g. reverse a rejection) | ✅ | ❌ | ❌ |

Anything not explicitly granted above is denied by default — enforce this as a deny-by-default check in middleware, not an allow-list you remember to update per new feature.

"Manage billing... plan/pricing config" got its first real substance in 2026-09 (docs/build-phases.md Phase 11 item 1, Monetization Flow A): `/staff/finance/billing`'s certificate-credit discount tiers and currency rates are both Admin/Finance-editable at any time (no redeploy needed), each edit audit-logged per §3 below.

## 3. Enforcement notes (for implementation)

- Enforce at **three layers**, not just one: Supabase RLS policies (DB-level), a server-side permission-check helper (`lib/permissions.ts`, used in every API route/server action), and UI-level hiding of nav items/actions the role can't use (UX only — never the actual security boundary).
- `AdminUser.role` is a single enum column (`admin | account_manager | finance`) — no need for a granular permissions table at this scale; the matrix above is the source of truth, implemented as a lookup table in `lib/permissions.ts` (`can(role, action)`).
- Every state-changing action by any staff role writes an `AuditLog` row regardless of role — Finance exporting a report, Account Manager approving an org, Admin changing another admin's role, all logged identically.

## 4. Super Admin Bootstrap

**The problem:** on day one, the `AdminUser` table is empty. Nobody can log into the staff console to create the first Admin account — there's no one there yet to do the inviting.

**The solution — a one-time, self-disabling bootstrap:**

1. `ADMIN_BOOTSTRAP_SECRET` is set in the environment (generate with `openssl rand -hex 32`, per `.env.example`) — known only to you, never committed.
2. A bootstrap entry point (`scripts/bootstrap-admin.ts`, run via `npm run bootstrap:admin`, **preferred over a public web route** since a CLI script run once against production has a much smaller attack surface than a permanently-deployed URL) does the following, server-side:
   - Checks `SELECT count(*) FROM admin_users` — **if the count is anything other than zero, it refuses immediately**, regardless of whether the correct secret was supplied. This check, not the secret, is the real gate.
   - If the table is empty and the correct `ADMIN_BOOTSTRAP_SECRET` is provided, prompts for (or accepts as arguments) the first Admin's name, email, and a temporary password, creates the Supabase Auth user, and inserts the first `AdminUser` row with `role = admin`.
   - Writes an `AuditLog` row for the bootstrap event itself (`actor_type: system`, `action: bootstrap_admin_created`).
3. Immediately after first use: **remove or rotate `ADMIN_BOOTSTRAP_SECRET`** from your Vercel environment variables. The zero-count check means a leaked old secret is harmless once an Admin exists, but rotating it is good hygiene anyway.
4. From then on, all further staff accounts (more Admins, Account Managers, Finance) are created through `/staff/team` by an existing Admin — never through the bootstrap path again.

**If you'd rather have a web-based fallback** (e.g. deploying somewhere without shell/CLI access): implement `/staff/bootstrap` as a Next.js route with the identical zero-count-plus-secret gate, but treat it as strictly temporary — the build-phases prompt for this explicitly calls out removing or permanently disabling the route after first use, not just relying on the zero-count check to keep it dormant forever.

## 5. Staff login surface

Recommend a distinct path for staff auth — `/staff/login` rather than reusing `/login` (which is issuer/public-facing) — as a small but real defense-in-depth measure (staff accounts are higher-value targets; a separate surface makes it easier to apply stricter rate-limiting and mandatory MFA specifically to it). MFA (TOTP) should be **mandatory**, not optional, for all three internal roles — unlike issuer accounts where it's recommended but not enforced in v1.
