# Certified

**Certified** is a trust infrastructure platform for training providers. Approved businesses, training centres, and individual trainers use Certified to issue branded, gold-sealed certificates that are instantly and publicly verifiable — and to give their certified trainees a discoverable, hireable public profile.

Certified designs the certificate. The issuer supplies the people and the training. The public verifies with one scan.

## What this repo contains

| Doc | Purpose |
|---|---|
| `docs/blueprint.md` | Full product blueprint — roles, flows, data model, security review |
| `docs/roles-permissions.md` | Three-role staff model (Admin / Account Manager / Finance), full permission matrix, super admin bootstrap flow |
| `docs/sitemap.md` | Every page in the product — public site, issuer dashboard, staff console — with role access per page |
| `docs/design-system.md` | Visual design system — brand, typography, motion, interaction/hover states, responsive dashboard patterns, certificate templates |
| `docs/build-phases.md` | Phase-by-phase build plan with Claude Code prompts + account setup checklist |
| `docs/declaration-form.md` | Individual trainer self-attestation form (NIN path) |
| `lib/certificates/GoldSeal.tsx` | The mandatory gold seal every certificate carries (react-pdf component, no standalone SVG file) |

## Stack

- **Next.js (App Router)** — hosted on **Vercel**
- **Supabase** — Postgres, Auth (email + Google + TOTP), Storage
- **@react-pdf/renderer** — certificate PDF generation (serverless-friendly, no headless Chrome)
- **qrcode** — verification QR generation
- **Upstash Redis** — rate limiting (verification lookups, contact-reveal)
- **Altcha** — self-hosted proof-of-work bot protection on public forms
- **Resend** — transactional email

All free-tier at launch scale. See `docs/build-phases.md` for account setup steps.

## Getting started

```bash
git clone <repo-url>
cd certified
cp .env.example .env.local   # fill in your own keys — see docs/build-phases.md
npm install
npm run dev
```

## Project status

Pre-build. Follow `docs/build-phases.md` in order — each phase has a ready-to-use Claude Code prompt.

## Ownership

© Sun Media Limited. All rights reserved. See `LICENSE`.
