-- Phase 1 schema changes (docs/blueprint.md §3.1, §4) — applied as a new
-- migration rather than editing 0003_organizations.sql, since that file is
-- already live on the hosted project. NIN is dropped entirely as an
-- identification method, replaced by a generic identification document
-- upload (already covered by the existing owner_id_document_url column —
-- no schema change needed there, just a documentation/UI change) plus a
-- proof-of-operation upload and an expected-trainee-volume band.

-- NIN is gone — identification is now owner_id_document_url alone (any
-- means of identification), which already existed.
alter table organizations drop column owner_nin;

-- RC/CAC number is now optional for both applicant types (individual
-- trainers without a registered business leave it blank). The old
-- unconditional unique constraint would reject a second null value the
-- moment one existed (NULLs are usually distinct in a unique constraint,
-- but making the intent explicit here rather than relying on that: a
-- partial index only enforces uniqueness where rc_number is actually
-- present).
alter table organizations alter column rc_number drop not null;
alter table organizations drop constraint organizations_rc_number_unique;
create unique index organizations_rc_number_unique_idx on organizations (rc_number) where rc_number is not null;

-- Proof of operation (CAC certificate) — required for Business/Training
-- Centre applicants, optional for Individual Trainers. That "required for
-- one type, optional for the other" rule is form/application-layer logic,
-- not a DB constraint (a check constraint keyed on `type` would work today
-- but is brittle against future application types) — enforced in the
-- /apply submit handler instead.
alter table organizations add column proof_of_operation_url text;

-- Expected trainee volume, banded rather than a raw number (docs/blueprint.md
-- §3.1).
create type trainee_volume_band as enum ('0-5', '6-15', '16-29', '30+');
alter table organizations add column trainee_volume_band trainee_volume_band;

-- The declaration form (docs/declaration-form.md) needs two more fields
-- than the original owner_declaration_signed_at alone: which version of the
-- declaration text was shown (so future wording edits don't retroactively
-- change what a past applicant agreed to), and the submission IP.
alter table organizations add column declaration_version text;
alter table organizations add column declaration_submission_ip text;

-- === Storage: application documents (identification + proof of operation) =
-- Private bucket — CLAUDE.md rule #8 (uploads re-encoded server-side,
-- never served back as raw bytes) and rule #5-adjacent reasoning: these are
-- KYC-sensitive documents, never public.
insert into storage.buckets (id, name, public)
values ('application-documents', 'application-documents', false)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by default on every Supabase
-- project (it's owned by supabase_storage_admin, not the role migrations
-- run as) — trying to ALTER TABLE ... ENABLE ROW LEVEL SECURITY on it here
-- fails with "must be owner of table objects" even though RLS is already
-- on. CREATE POLICY below doesn't need table ownership, just the grants
-- Supabase already sets up for this exact pattern.

-- Applicants upload under a path prefixed with their own auth uid
-- (org_id doesn't exist yet at first-upload time — the Organization and
-- the uploaded file are created in the same submission). Read-back is
-- needed so the /apply wizard can show "already uploaded" state across
-- steps.
create policy application_documents_owner_all on storage.objects
  for all
  using (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'application-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin + Account Manager: read every application document, for review
-- (docs/roles-permissions.md §2 "View applicant KYC documents"). Finance is
-- deliberately excluded, same reasoning as the applications table itself.
create policy application_documents_staff_select on storage.objects
  for select
  using (
    bucket_id = 'application-documents'
    and (is_admin() or is_account_manager())
  );
