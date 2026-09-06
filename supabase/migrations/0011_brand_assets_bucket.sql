-- Public storage bucket for issuer brand assets (logo, signature image) —
-- docs/build-phases.md Phase 3. Distinct from the private
-- application-documents bucket (0010): a logo/signature needs to be
-- publicly viewable (shown on certificate PDFs and, later, the public
-- directory), so this bucket is public=true from the start rather than
-- gated behind signed URLs.
insert into storage.buckets (id, name, public)
values ('org-brand-assets', 'org-brand-assets', true)
on conflict (id) do nothing;

-- Owner can upload/update/delete under a path prefixed with their own auth
-- uid — same convention as application-documents (0010), chosen for the
-- same reason: it's stable and known before any other id lookup.
create policy org_brand_assets_owner_all on storage.objects
  for all
  using (
    bucket_id = 'org-brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'org-brand-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public bucket — anyone (including anon) can read. Supabase Storage
-- doesn't grant anon read on a bucket just because it's marked public;
-- that flag only changes how object URLs resolve (no signing required),
-- read access still needs its own policy.
create policy org_brand_assets_public_select on storage.objects
  for select
  using (bucket_id = 'org-brand-assets');

-- Admin + Account Manager: full access too, for support/moderation
-- purposes (e.g. removing an inappropriate logo).
create policy org_brand_assets_staff_all on storage.objects
  for all
  using (bucket_id = 'org-brand-assets' and (is_admin() or is_account_manager()))
  with check (bucket_id = 'org-brand-assets' and (is_admin() or is_account_manager()));
