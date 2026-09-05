# Certified — Full Sitemap & Page Inventory

Every route in the product, grouped by area, with who can access it and what it needs to do. This is the checklist against which "is the build complete" gets judged — if a page below doesn't exist yet, the build isn't done.

Legend: 🌐 public/no-auth · 🔒 authenticated · role tags where relevant (**AM** = Account Manager, **FIN** = Finance)

---

## 1. Public marketing site

| Path | Page | Purpose |
|---|---|---|
| `/` | Home | Hero + trust proposition, "Verify a certificate" + "Apply as a trainer/business" dual CTA, how-it-works summary, stats (issuers approved, certificates issued — once non-zero), footer nav |
| `/how-it-works` | How it works | Longer explainer: for issuers, for the public, verification mechanics |
| `/for-businesses` | Issuer landing | Value prop for training centres/trainers, "Apply now" CTA, FAQ specific to issuers |
| `/for-individuals` | Public/employer landing | Value prop for the directory/hiring use case, "Browse the directory" CTA |
| `/pricing` | Pricing | "Free for approved issuers" today; forward-looking note on future premium tiers (§10 of blueprint) — no dark-pattern "contact us" pricing |
| `/security` | Security & trust | Plain-English explainer of the seal, signing, revocation transparency — this page *is* part of the trust product |
| `/faq` | FAQ | Common questions, split by audience (issuer / public / trainee) |
| `/about` | About | Company info (Sun Media Limited / SUNIMTECH context if relevant) |
| `/contact` | Contact | General contact form (routes to Account Manager queue) |
| `/terms` | Terms of Service | Legal |
| `/privacy` | Privacy Policy | NDPA-compliant privacy policy — must explicitly cover trainee data handling per blueprint §6 |

## 2. Verification & directory (🌐 public, no auth)

| Path | Page | Purpose |
|---|---|---|
| `/verify` | Manual verify | Enter a public ID manually, or prompt to scan a QR |
| `/verify/[public_id]` | Verification result | The core trust moment — status, issuer, trainee, program, animated reveal per design-system §2 |
| `/directory` | Directory search | Filter by field, state/LGA, issuer, date range, open-to-hire |
| `/directory/trainee/[id]` | Trainee public profile | Bio, photo, certificate(s), issuer, gated contact action |
| `/directory/org/[slug]` | Issuer public profile | Org bio, training programs, trainee roster, contact action |

## 3. Auth

| Path | Page | Notes |
|---|---|---|
| `/signup` | Sign up | Leads into `/apply` |
| `/login` | Login (issuer/applicant) | Email/password + Google |
| `/forgot-password`, `/reset-password` | Password recovery | Standard Supabase Auth flow |
| `/verify-email` | Email verification notice | — |
| `/mfa-setup`, `/mfa-challenge` | TOTP setup/challenge | Recommended for issuers, mandatory for staff |
| `/staff/login` | Staff login | Separate surface per `roles-permissions.md` §5, mandatory MFA |

## 4. Applicant flow (🔒 pre-approval)

| Path | Page | Notes |
|---|---|---|
| `/apply` | Multi-step application wizard | Business/Individual branch, docs upload, declaration for individuals |
| `/apply/status` | Application status | Pending / more-info-requested (with thread) / approved / rejected (with reason + immediate reapply CTA) |

## 5. Issuer dashboard (🔒 approved issuers, path prefix `/dashboard`)

| Path | Page | Notes |
|---|---|---|
| `/dashboard` | Overview | Issuance stats, active programs, recent certificates, pending leads, quick actions |
| `/dashboard/brand` | Brand settings | Logo, color, signatory, template choice (Angle/Frame/Block), live preview |
| `/dashboard/programs` | Programs list | All training programs, status, roster count |
| `/dashboard/programs/new` | New program | Create a `TrainingProgram` |
| `/dashboard/programs/[id]` | Program detail | Edit program, view roster |
| `/dashboard/programs/[id]/issue` | Issue certificate | Single-trainee entry form |
| `/dashboard/programs/[id]/bulk-issue` | Bulk issue | CSV upload, validation preview, job progress |
| `/dashboard/certificates` | All certificates | Search/filter across all programs, per-cert actions |
| `/dashboard/certificates/[id]` | Certificate detail | PDF view/download, verification link, revoke action |
| `/dashboard/trainees` | Trainee roster | Full list across programs, contact-lead indicator |
| `/dashboard/directory-profile` | Public profile preview | How the org appears in `/directory/org/[slug]`, edit org bio |
| `/dashboard/messages` | Inbound leads | Contact/hire messages relayed from the public directory (Phase 6) |
| `/dashboard/settings` | Account settings | Profile, password, 2FA |
| `/dashboard/settings/team` | Team (deferred) | Multi-user issuer accounts — placeholder page noting "coming soon," flagged deferred in blueprint §10 |
| `/dashboard/billing` | Billing (deferred) | "You're on the Free plan" placeholder; real billing UI ships with monetization |
| `/dashboard/help` | Help/support | Contact Certified, FAQ links |

## 6. Staff console (🔒 internal only, path prefix `/staff`, role-gated per row)

| Path | Page | Admin | AM | FIN |
|---|---|:---:|:---:|:---:|
| `/staff` | Role-aware overview (each role sees a different dashboard — ops metrics for AM, usage/cost for FIN, everything for Admin) | ✅ | ✅ | ✅ |
| `/staff/applications` | Review queue | ✅ | ✅ | ❌ |
| `/staff/applications/[id]` | Application detail + decision | ✅ | ✅ | ❌ |
| `/staff/organizations` | All organizations | ✅ | ✅ | ✅ (limited columns) |
| `/staff/organizations/[id]` | Org detail (fields shown vary by role per permission matrix) | ✅ | ✅ | ✅ (limited) |
| `/staff/certificates` | Platform-wide certificate search | ✅ | ✅ | ❌ |
| `/staff/revocations` | Revocation queue/actions | ✅ | ✅ | ❌ |
| `/staff/moderation` | Flagged directory content | ✅ | ✅ | ❌ |
| `/staff/support` | Escalation/contact queue | ✅ | ✅ | ❌ |
| `/staff/analytics` | Operational analytics | ✅ | ✅ (read-only) | ❌ |
| `/staff/finance` | Usage-vs-free-tier dashboard | ✅ | ❌ | ✅ |
| `/staff/finance/reports` | Exportable financial/usage reports | ✅ | ❌ | ✅ |
| `/staff/finance/billing` | Plan/pricing config (deferred until monetization) | ✅ | ❌ | ✅ |
| `/staff/team` | Manage staff accounts (invite, role, suspend) | ✅ | ❌ | ❌ |
| `/staff/audit-log` | Full audit trail | ✅ (all) | own actions | own actions |
| `/staff/settings` | System settings (templates, rate limits, integrations) | ✅ | ❌ | ❌ |
| `/staff/bootstrap` | One-time first-admin creation (self-disables) | — | — | — |

---

## 7. Cross-cutting UI shells

- **Public shell**: top nav (logo, How it works, Directory, Verify, Apply, Login), footer (legal, about, contact).
- **Issuer dashboard shell**: left sidebar nav (collapsible), top bar with org switcher-free (single org per account in v1), notifications bell (leads, application status changes).
- **Staff console shell**: left sidebar nav with role-based item visibility (per §6 table — Finance never sees "Applications" in their nav at all, not just a blocked page), top bar with staff identity + role badge.

All three shells follow the responsive/dashboard layout patterns in `docs/design-system.md` §8.
