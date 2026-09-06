# Certified — Platform Blueprint v1.0

**Tagline concept:** "Every certificate, verifiable in seconds."

A trust infrastructure layer for training providers: Certified designs and issues branded certificates on behalf of approved trainers/businesses, gives every certificate a cryptographically verifiable public record, and turns certified trainees into a searchable, hireable public directory.

---

## 1. Product Pillars

1. **Issuer Trust Layer** — Businesses/trainers must apply and be approved (KYC-style review) before they can issue anything. This is what makes a "Certified" badge mean something.
2. **Certificate Design & Generation** — Certified designs the certificate (brand-consistent, reusable per issuer) — issuer never touches design tools. *Custom-upload of pre-designed certificates is explicitly a Phase 2 feature (see §10) — not in v1 launch scope.*
3. **Verification** — Any certificate, or any certified individual, can be looked up and cryptographically confirmed authentic, non-forgeable, and revocable.
4. **Public Directory & Hire Layer** — The public can discover certified people by skill + location, and contact them or their issuing trainer directly.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Public Visitor** | No account needed to verify a certificate or browse the directory. Optional free account to save searches/bookmark trainees. |
| **Applicant** | A business, training centre, or individual trainer mid-application, pre-approval. Can log in, edit application, upload documents, but cannot issue anything. |
| **Issuer (Approved Business/Trainer)** | Approved applicant. Can create training programs, add trainees, generate certificates, manage brand settings, view analytics. |
| **Trainee / Certified Individual** | Has a public profile (created by the issuer on their behalf, trainee can later claim/edit it via an invite link + verification). Appears in directory, receives inquiries. |

### Internal (staff) roles

Certified's internal team is not one undifferentiated "admin" — it's three roles with different scopes, mirroring how most trust/marketplace platforms separate operations from finance so no single non-owner role can touch everything:

| Role | Scope (one line) |
|---|---|
| **Admin** | Full platform power — everything below, plus system settings, signing/security config, and managing the other two roles' accounts. |
| **Account Manager** | Day-to-day trust & ops: application review/approval, issuer support, content moderation, revocations. Cannot touch finance data or manage staff accounts. |
| **Finance** | Usage/cost monitoring and (once monetization ships) billing, invoicing, plan management, financial reporting. Cannot review applications or moderate content. |

Full permission matrix, the reasoning behind the split, and the **super admin bootstrap** flow (how the very first Admin account gets created) live in `docs/roles-permissions.md`. The complete page-by-page inventory of the app — public site, issuer dashboard, and role-gated staff console — lives in `docs/sitemap.md`.

---

## 3. Core Flows

### 3.1 Issuer Application → Approval
*("Agent" below means whichever staff role can review applications — **Account Manager** or **Admin**; see `docs/roles-permissions.md`. Finance cannot review or decide applications.)*

1. Applicant signs up (email or Google via Supabase Auth) → chooses "Business/Training Centre" or "Individual Trainer".
2. Fills structured application:
   - Legal/registered name, RC number (CAC for Nigerian entities) — **optional**, since individual trainers without a registered business leave this blank
   - Identification document upload — any means of identification (business/work ID card, government-issued ID, etc.), required for both applicant types
   - Proof of operation: CAC certificate upload — required for Business/Training Centre applicants; optional for Individual Trainers, who typically won't have one
   - **For Individual Trainers only: a signed declaration form** (self-attestation of the training they claim to deliver, plus consequences of false declaration stated plainly on the form) — referencing the identification document uploaded above, not a national ID number
   - Business address + state/LGA (structured, not free text — see §7)
   - Owner/contact full legal name, phone, email — someone reachable, not just a name
   - Expected trainee volume this year, banded: 0-5 / 6-15 / 16-29 / 30+
   - Field(s) of training they intend to certify in
   - Sample of what they train (short description) — this becomes the public "training profile"
3. Application enters **Pending Review** queue.
4. Agent reviews in Admin console → three actions:
   - **Approve** → issuer unlocked, onboarding wizard to set brand (logo, colors, signatory name/signature image, template pick)
   - **Request More Info** → structured comment thread, applicant notified, application returns to Draft state on their end, resubmission re-enters queue
   - **Reject** → reason required (from a controlled list + free text), applicant notified, can reapply **immediately** with no cooldown — but each resubmission is logged, so an agent reviewing a repeat applicant can see the full prior rejection history at a glance (protects against spam/abuse without adding friction for genuine applicants who fix real issues fast)
5. All decisions are **audit-logged** (agent id, timestamp, reason, before/after state) — never silently overwritten.

### 3.2 Brand Setup (post-approval)
- Issuer picks from a set of Certified-designed certificate templates (v1: e.g. 4–6 "lightweight modern classy" layouts — minimalist border, single accent color, serif/sans title pairing, subtle seal/emblem placeholder).
- Issuer sets: primary brand color, logo upload, signatory name + title, signature image (upload or type in a script font), issuing body full name as it should appear.
- This brand config is stored once and reused for every certificate generated for that issuer — **consistency enforced by the system**, issuer cannot deviate per-certificate (prevents brand/format chaos and keeps output "classy" by design).

### 3.3 Certificate Issuance
Two v1 paths, both issuer-driven:

**A. Single Trainee Entry**
- Issuer creates a "Training Program" record (title, description, duration, field/category, date range).
- Adds a trainee: full name, photo (optional), contact (phone/email — trainee controls visibility), short bio for public directory, completion date, grade/distinction if applicable.
- System generates certificate PDF + unique verification record instantly.

**B. Bulk / Cohort Entry**
- CSV upload (template provided) for a graduating cohort under one Training Program.
- System validates rows (required fields, duplicate detection within the batch), shows a preview/error report before committing.
- Batch-generates certificates + directory profiles for the whole cohort in one job (queued, since Vercel functions have execution time limits — see §8.3).

Every issuance:
- Creates a **Certificate** record (immutable core fields) + a **Trainee/Certified Individual** profile (editable — bio, contact prefs, photo can be updated later; the certificate's factual content cannot be edited after issuance, only *revoked* and reissued if there was an error, with the correction trail preserved).

### 3.4 Verification
- Every certificate has:
  - A unique, non-sequential public ID (e.g. `CERT-8F2K9-XQ41` — random, not incremental, so IDs can't be enumerated/scraped in order)
  - A QR code printed on the certificate linking to `certified.app/verify/{public_id}`
  - A cryptographic signature (HMAC or Ed25519, server-side secret) over the certificate's core fields, stored alongside the record and re-checked on every verification request — detects any tampering with the stored record itself, not just the PDF
- Verification page shows: issuer name (with "Approved Issuer" badge), trainee name/photo, training title, completion date, status (**Valid** / **Revoked** / **Expired** if the issuer set an expiry, e.g. for safety certifications).
- No login required to verify — this is the trust product, it must be frictionless.

### 3.5 Public Directory & Hire
- Search/filter by: field/skill, state/LGA, issuer, completion date range, availability status (trainee can toggle "open to hire").
- Trainee profile shows: name, photo, bio, certificate(s) earned, issuer, "Verified Certified" badge, contact button.
- **Contact gating** (see §6) — no scraping of raw phone/email; a "Contact" action either reveals contact info behind a light rate-limited gate, or routes through an in-platform message/lead form the trainee/issuer receives by email.
- Issuer's own public page lists their training programs + roster of certified trainees, and can also be contacted directly.

---

## 4. Data Model (core entities)

```
Organization (issuer)
  id, type[business|individual], legal_name, display_name,
  rc_number (optional — CAC/business registration; individual trainers without one leave this blank),
  proof_of_operation_url (CAC certificate upload — business applicants; optional for individuals),
  trainee_volume_band[0-5|6-15|16-29|30+] (expected trainees per year),
  status[pending|more_info_requested|approved|rejected|suspended],
  brand: { logo_url, primary_color, template_id, signatory_name,
           signatory_title, signature_image_url },
  address: { state, lga, street (private), geo (optional, future) },
  owner: { full_name, phone, email, id_document_url (any means of
           identification — business/work ID card, government ID, etc.),
           declaration_signed_at, declaration_version, declaration_submission_ip
           (individual trainers only) },
  created_at, approved_at, approved_by (agent_id)

Application (versioned submissions tied to an Organization)
  id, org_id, submitted_data (jsonb snapshot), status, agent_notes[],
  decision_history[] { agent_id, action, reason, at }

TrainingProgram
  id, org_id, title, description, field/category, duration,
  start_date, end_date, created_at

Trainee (public directory profile)
  id, org_id, program_id, full_name, photo_url, bio, phone, email,
  contact_visibility[public|gated|hidden], open_to_hire (bool),
  state, lga, claimed (bool), claim_token, created_at

Certificate
  id, public_id (random, indexed), trainee_id, org_id, program_id,
  trainee_name_snapshot, program_title_snapshot, completion_date,
  grade, issue_date, expiry_date (nullable),
  status[active|revoked|expired], revoked_reason, revoked_at,
  signature_hash, pdf_url, created_at

AdminUser (internal staff)
  id, name, email, role[admin|account_manager|finance],
  status[active|suspended], invited_by (admin_user_id),
  mfa_enabled (bool), created_at, last_login_at
  -- full permission matrix per role: docs/roles-permissions.md
  -- first row ever created only via the bootstrap flow (docs/roles-permissions.md §Bootstrap)

AuditLog
  id, actor_id, actor_type, action, target_type, target_id,
  before, after, at
```

Key design choice: **Certificate stores snapshots** of trainee name / program title at issue time. If a trainee later edits their bio or an org renames itself, historical certificates still verify against what was true *at issuance* — this is what makes verification legally meaningful.

---

## 5. Certificate Design System

- v1 ships **10 fixed templates** (see `docs/design-system.md` §4 for the full set — Angle, Frame, Block, Ribbon, Monogram, Wave, Hex, Split, Deco, Halo): clean single-accent-color geometry, generous whitespace, one serif display font for the trainee name, one sans for body — no clutter, no gradients-for-gradient's-sake. Think "modern professional letterhead," not "clip-art diploma."
- Rendered with `@react-pdf/renderer` (React components → PDF, vector output, crisp at any size, small file size, runs fine in Vercel serverless functions without a headless browser).
- QR code generated server-side (`qrcode` npm package) and embedded as an image node in the PDF.
- Every template pulls from the same brand token set (logo, color, signatory) so switching templates later doesn't mean redesigning — this also makes future custom-template support (Phase 2) a matter of adding a new "compiled template" rather than architecture change.

### 5.1 Certified Gold Seal (mandatory, every certificate)
- Every certificate — regardless of template or issuer brand color — carries a **fixed gold seal element bearing "Certified"** (wordmark/emblem, e.g. a circular foil-style seal in the platform's gold, not the issuer's brand color). This is non-configurable by issuers.
- Function: it's the platform's own trust mark, distinct from the issuer's branding — the seal is what a viewer recognizes at a glance as "this came through Certified's verification system," independent of which business issued it.
- Design notes: render as a vector graphic (not a raster gold-gradient image, to keep file size small and stay crisp at print size) — a radial foil-gold disc with a thin ring, a low-opacity star watermark at center, and bold "CERTIFIED" lettering placed at a fixed spot per template (bottom-right on most; see `docs/design-system.md` §5 for the two templates that place it elsewhere) across all 10 templates.
- The seal sits **next to, not on top of,** the QR code — both are trust signals but serve different purposes (seal = visual brand recognition, QR = the actual verifiable link). Never let the seal substitute for or obscure the QR/public ID.
- Because it's identical across every issuer, it also becomes a mild anti-forgery aid: a certificate *without* it, or with a poorly-reproduced version of it, is an immediate visual red flag — a lightweight, human-readable signal on top of the cryptographic one.

---

## 6. Security & Loophole Review

This is the part that decides whether "Certified" actually earns trust. Going through the abuse surface systematically:

| Risk | Mitigation |
|---|---|
| **Fake business applies to get "verified" status** | Mandatory CAC/ID document upload + human agent review before any issuance capability unlocks. Nothing is auto-approved in v1. |
| **Certificate ID guessing / enumeration** | Public IDs are random (not sequential integers), rate-limited lookup endpoint (Upstash Redis, e.g. 10 lookups/min/IP), no bulk-listing endpoint of all certificate IDs. |
| **Certificate forgery (fake PDF claiming to be from Certified)** | The PDF itself is not the source of truth — the QR always resolves to the live database record. Verification page, not the PDF file, is authoritative. Optionally embed the signature hash as visible small print on the cert so a savvy checker can cross-reference. |
| **Tampering with a stored certificate record (DB-level)** | HMAC/Ed25519 signature computed over core fields at issuance, stored separately, re-validated on every verify request — a direct DB edit without going through the signing service invalidates the signature and flips status to "integrity check failed." |
| **Issuer account compromise → mass-issuing fraudulent certs** | 2FA required for issuer accounts (Supabase Auth supports TOTP), anomaly alerts on unusual issuance volume/spikes, agent can freeze an org instantly. |
| **Trainee data used without consent** | Explicit consent checkbox at trainee-add time captured by the issuer ("I confirm this trainee has consented to a public profile"); trainee gets an email with a claim link to edit/hide/delete their own profile at any time — this is also your NDPR (Nigeria Data Protection Act) compliance hook. |
| **Public contact info scraped/harvested** | Never render raw phone/email in page HTML for unauthenticated users; "Reveal contact" action is rate-limited + optionally requires a lightweight CAPTCHA (Altcha — self-hosted, free) after N reveals per IP/session; alternative is an in-app message relay so contact info is never exposed at all (recommended default). |
| **Fake/duplicate trainee profiles to inflate an issuer's roster** | Certificates are the only thing that creates a directory entry — no "add trainee" without a linked certificate, and duplicate detection (name + org + program + date) flags likely dupes for agent review. |
| **Sybil applications (one bad actor, many shell "orgs")** | RC number is checked for uniqueness across the platform when present; since it's optional (individual trainers may not have one) and resubmission has no cooldown, repeated applications from the same RC number, identification document, or device fingerprint are surfaced to the agent as a visible history on the review screen, not blocked outright — keeps the door open for genuine fast-fixers while giving agents the context to catch abuse. |
| **Location spoofing in directory (claiming presence in an area for reach)** | v1 uses issuer-declared state/LGA (verified against submitted address docs at approval time), not user-editable freely afterward without triggering re-review. |
| **Certificate needs to be invalidated later (error, fraud discovered, expired safety cert)** | `status: revoked` with reason + timestamp, permanently visible in verification history ("This certificate was revoked on [date]: [reason]") — revocation is disclosed, not silently deleted, which preserves trust in the system itself. |
| **Admin/agent abuse (wrongful approval/rejection, insider risk)** | Every decision is audit-logged with actor, reason, before/after; super admin can review agent decision history; consider a "4-eyes" rule for reversing an approval later. |
| **PDF/photo upload used as an attack vector (malware, oversized files, executable disguised as image)** | Strict file-type + size validation, re-encode uploaded images server-side (strip EXIF/metadata, re-save as clean JPEG/WebP) rather than serving user-uploaded bytes directly, virus-scan on document uploads if volume justifies it later (e.g. via a free-tier ClamAV Lambda layer down the line). |
| **Rate/cost abuse of PDF generation endpoint** | Only authenticated, approved issuers can trigger generation; per-org daily/monthly issuance quota configurable by admin (protects your Vercel function-invocation budget on free tier). |

---

## 7. Location Data Approach

For v1, use **structured Nigerian State → LGA dropdowns** (a static JSON list) rather than full geolocation/PostGIS — simpler, free, zero API cost, and matches how people naturally search ("trainers in Uyo" vs. lat/long "near me"). Optional lat/long "near me" search is a good Phase 2 addition once there's directory density to justify it (flagged in §10).

---

## 8. Tech Stack (Vercel + Free Tier, globally competitive)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14/15 (App Router)** on Vercel | SSR for crawlable/shareable verification + directory pages, one deploy target, free Vercel tier covers this comfortably at launch scale |
| Database | **Supabase (Postgres)** free tier | Generous free tier, row-level security for role-based access, same stack you're already using elsewhere |
| Auth | **Supabase Auth** (email + Google OAuth + TOTP 2FA) | Free, integrates directly with Postgres RLS |
| File storage | **Supabase Storage** (logos, ID docs, photos) | Free tier bucket, signed URLs for private docs (ID uploads should never be public) |
| Certificate PDF | **@react-pdf/renderer** | Serverless-friendly, no headless Chrome needed, fast, small output |
| QR codes | **qrcode** (npm) | Generated server-side at issuance |
| Rate limiting | **Upstash Redis** free tier | Protects verification + contact-reveal endpoints |
| Bot/spam protection | **Altcha** (free, self-hosted) | On application form + contact-reveal |
| Email (notifications, decisions, claim links) | **Resend** free tier | Clean deliverability, good free quota |
| Background jobs (bulk CSV issuance) | **Vercel Cron + Supabase Edge Functions**, or a simple queue table processed by a scheduled function | Avoids Vercel's per-invocation timeout on large batches |
| Search (directory filtering) | Postgres full-text search / indexed columns (state, lga, field) | No need for a separate search service at v1 scale |
| Monitoring | **Vercel Analytics** (free) + Supabase logs | Free tier sufficient at launch |
| Signing | Ed25519 keypair or HMAC secret stored in Vercel env vars, signing done server-side only | Never expose signing key to client |

This whole stack has a genuine $0 floor at launch scale and scales gracefully — every piece has a paid tier to graduate into later without a rewrite.

---

## 9. Suggested Build Phases

- **Phase 0** — Repo setup, design tokens/brand system for Certified itself, Supabase schema + RLS policies, auth scaffolding
- **Phase 1** — Applicant onboarding + application form + document upload
- **Phase 2** — Admin console: review queue, approve/request-info/reject flow, audit log
- **Phase 3** — Issuer brand setup wizard + template selection
- **Phase 4** — Certificate generation engine (single-entry) + signing + QR + verification page
- **Phase 5** — Trainee directory profiles + public search/filter by field & location
- **Phase 6** — Contact/hire flow (reveal-gate or message relay) + rate limiting
- **Phase 7** — Bulk/CSV cohort issuance + background job queue
- **Phase 8** — Trainee self-claim flow (edit/hide own profile via emailed claim link)
- **Phase 9** — Admin analytics (issuance volume, top fields, geographic spread), revocation workflow
- **Phase 10** — Polish, load-test verification endpoint, launch

---

## 10. Explicitly Deferred to Future Development (captured, not built at v1)

- **Custom certificate upload** — issuer supplies their own pre-designed certificate (PDF/image), Certified overlays verification data (QR + public ID) onto it rather than generating from a template. Requires: file validation, overlay-positioning UI (drag QR/ID placement), and a review step to prevent brand impersonation risk.
- Geolocation-based "near me" search (lat/long, PostGIS)
- Trainee self-registration to request certification directly from an issuer (currently issuer-initiated only)
- Multi-language support (English/Pidgin/local languages)
- Public API for third parties (e.g. employers) to verify certificates programmatically
- Paid tiers for issuers (premium directory placement, advanced analytics, custom domains for their public page)
- Mobile app (React Native, matching your other builds)
- AI-assisted résumé/skill matching between employers and certified individuals
- Recurring/expiring certification reminders (e.g. safety recertification)

---

## 11. Confirmed Decisions (v1.1)

1. **Gold seal** — every certificate carries a fixed, non-configurable gold "Certified" seal, distinct from issuer branding (see §5.1).
2. **Contact info** — gated by default across the directory; no public opt-out in v1.
3. **Individual trainer verification** — identification document (any means — business/work ID card, government ID, etc.) + signed declaration, no CAC/RC number required.
4. **Rejection cooldown** — none; immediate reapplication allowed, with full prior-attempt history visible to reviewing agents.
5. **Certificate expiry** — supported as an issuer-level, per-program option (off by default, opt-in for fields like safety recertification).
6. **Launch templates** — 10 templates (Angle, Frame, Block, Ribbon, Monogram, Wave, Hex, Split, Deco, Halo — see `docs/design-system.md` §4), each carrying the gold seal.
7. **Gold seal artwork** — finalized: radial foil-gold disc, single thin ring, low-opacity center watermark, bold "CERTIFIED" lettering. See `docs/design-system.md` §5.

## Next to Decide

- Declaration form wording for individual trainers (legal-ish self-attestation language).
