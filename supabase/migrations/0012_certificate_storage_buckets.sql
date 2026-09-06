-- Phase 4 schema changes, part 1 of 4 (docs/build-phases.md Phase 4) —
-- certificate/trainee-photo storage. Split into its own migration file
-- rather than one big Phase-4 migration: pasting a single transaction that
-- touched both storage.objects and public-schema tables (audit_log,
-- training_programs) in one run deadlocked against Supabase's own
-- background Storage/PostgREST processes (which routinely take locks on
-- storage.objects and on public tables in the opposite order while
-- refreshing their schema cache) — Postgres error 40P01, "deadlock
-- detected." Keeping each file's transaction scoped to one or two closely
-- related tables shortens the lock-holding window enough that this doesn't
-- happen in practice. If this file *itself* still hits a deadlock (rare,
-- but locking is inherently a race against whatever else is running), it's
-- safe to just paste and run it again — a failed multi-statement paste is
-- one implicit transaction, so nothing from it partially commits.

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
