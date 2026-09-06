-- Phase 4 schema changes (docs/build-phases.md Phase 4, docs/blueprint.md
-- §3.3-3.4) — certificate/trainee-photo storage, audit_log support for
-- issuer-initiated actions, per-program certificate expiry, and the
-- signature fields verification needs to recompute an HMAC server-side.

-- === Storage: certificates (public PDFs) ===================================
-- Public by design — a certificate PDF's URL is meant to be shared/printed;
-- the PDF itself is not the source of truth for trust (docs/blueprint.md §6
-- "Certificate forgery" mitigation — the verification page is authoritative),
-- so there's no confidentiality reason to gate it behind signed URLs.
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', true)
on conflict (id) do nothing;

-- Only the issuing org's owner can write into their own prefix; every write
-- in practice happens server-side via lib/supabase/admin.ts (service role,
-- which bypasses these policies entirely) after ownership is checked in
-- application code, but the policy is still here so a direct client upload
-- attempt is scoped the same way as every other per-owner bucket.
create policy certificates_bucket_owner_all on storage.objects
  for all
  using (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'certificates'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy certificates_bucket_public_select on storage.objects
  for select
  using (bucket_id = 'certificates');

create policy certificates_bucket_staff_all on storage.objects
  for all
  using (bucket_id = 'certificates' and (is_admin() or is_account_manager()))
  with check (bucket_id = 'certificates' and (is_admin() or is_account_manager()));

-- === Storage: trainee-photos (public, uid-prefixed) =========================
-- Public for the same reason org-brand-assets (0011) and trainees_public_view
-- (0009) are: the directory needs to display these images. Never used for
-- ID/KYC documents (those stay in the private application-documents bucket).
insert into storage.buckets (id, name, public)
values ('trainee-photos', 'trainee-photos', true)
on conflict (id) do nothing;

create policy trainee_photos_owner_all on storage.objects
  for all
  using (
    bucket_id = 'trainee-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'trainee-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy trainee_photos_public_select on storage.objects
  for select
  using (bucket_id = 'trainee-photos');

create policy trainee_photos_staff_all on storage.objects
  for all
  using (bucket_id = 'trainee-photos' and (is_admin() or is_account_manager()))
  with check (bucket_id = 'trainee-photos' and (is_admin() or is_account_manager()));

-- === audit_log: support issuer-initiated actions ============================
-- CLAUDE.md rule #7 says every admin *decision* is audit-logged; the issuer
-- dashboard's certificate revocation (docs/build-phases.md Phase 4) is a
-- distinct, narrower thing — an issuer correcting their own org's own
-- issuance, not a staff moderation decision (docs/roles-permissions.md §2's
-- "Revoke a certificate" row is about which *staff* roles can revoke, and
-- doesn't speak to an issuer's own corrections at all). It still deserves
-- the same "no decision path skips the audit trail" discipline, so audit_log
-- gains a third actor_type rather than a parallel table.
--
-- actor_id (references admin_users) can't represent an issuer — an issuer's
-- auth.uid() has no admin_users row. actor_user_id is the general-purpose
-- column for that: populated for actor_type = 'issuer', left null for
-- 'staff'/'system' (which keep using actor_id, unchanged).
alter table audit_log add column actor_user_id uuid references auth.users (id) on delete set null;

alter table audit_log drop constraint audit_log_actor_type_check;
alter table audit_log add constraint audit_log_actor_type_check
  check (actor_type in ('system', 'staff', 'issuer'));

comment on column audit_log.actor_user_id is
  'Set for actor_type = ''issuer'' (an org owner acting on their own data, '
  'e.g. certificate revocation) — actor_id/admin_users has no row for a '
  'non-staff auth user. Staff/system rows keep using actor_id as before.';

-- === training_programs: opt-in certificate expiry ===========================
-- docs/blueprint.md §11.5 "Certificate expiry — supported as an issuer-level,
-- per-program option (off by default, opt-in for fields like safety
-- recertification)". Null/0 means certificates issued under this program
-- never expire; a positive value means issuance computes
-- certificate.expiry_date = completion_date + this many months.
alter table training_programs add column certificate_validity_months integer
  check (certificate_validity_months is null or certificate_validity_months > 0);

-- === verify_certificate(): add signature_hash + org_id ======================
-- Phase 4's verification page must recompute the HMAC server-side and
-- compare against the stored value (CLAUDE.md rule #3 / docs/blueprint.md
-- §3.4) — the original function (0009) didn't return signature_hash or
-- org_id, both of which the signed payload is computed over
-- (lib/certificates/sign.ts). Exposing signature_hash to anon is fine here:
-- blueprint §6 explicitly suggests showing it as on-certificate small print,
-- and this function still only ever returns at most one row for one known
-- public_id — no enumeration path is opened by adding columns to it.
-- Also now returns revoked_reason/revoked_at, needed to render blueprint
-- §6's "This certificate was revoked on [date]: [reason]" disclosure — a
-- revocation must stay permanently visible on the verification page, not
-- just flip a status badge.
create or replace function verify_certificate(p_public_id text)
returns table (
  public_id text,
  org_id uuid,
  trainee_name text,
  program_title text,
  issuer_display_name text,
  completion_date date,
  issue_date date,
  expiry_date date,
  status certificate_status,
  grade text,
  pdf_url text,
  signature_hash text,
  revoked_reason text,
  revoked_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.public_id,
    c.org_id,
    c.trainee_name_snapshot,
    c.program_title_snapshot,
    o.display_name,
    c.completion_date,
    c.issue_date,
    c.expiry_date,
    c.status,
    c.grade,
    c.pdf_url,
    c.signature_hash,
    c.revoked_reason,
    c.revoked_at
  from certificates c
  join organizations o on o.id = c.org_id
  where c.public_id = p_public_id;
$$;

grant execute on function verify_certificate(text) to anon, authenticated;
