-- Persists what lib/contact/actions.ts's submitContactRequest has only
-- ever relayed by email until now (docs/blueprint.md §6's "message relay"
-- option) — /dashboard/messages (docs/sitemap.md §5's "Inbound leads")
-- has had nothing to read since Phase 6 shipped, since the relay never
-- wrote anything down. This table is purely additive alongside the
-- existing email send, not a replacement for it — the relay stays the
-- actual notification path, this is just a durable record of it.
--
-- Only organization-targeted requests are ever an issuer's "messages" —
-- a trainee-targeted request is the trainee's own inbound lead, not
-- their issuing org's, and trainees have no dashboard of their own to
-- read it from yet (out of scope here). target_id IS the organization id
-- when target_type = 'organization', so no separate org_id column is
-- needed to query "this org's messages."

create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('trainee', 'organization')),
  target_id uuid not null,
  sender_name text not null,
  sender_email text not null,
  sender_phone text,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index contact_requests_target_idx on contact_requests (target_type, target_id);

comment on table contact_requests is
  'Durable record of every lib/contact/actions.ts relay (docs/blueprint.md '
  '§6) — the email send is still the actual notification, this is what '
  '/dashboard/messages reads. No reply-in-app: replying still happens over '
  'email, same as today, via the relay email''s replyTo (the sender''s own '
  'address).';

alter table contact_requests enable row level security;

-- Insert only ever happens from submitContactRequest via the service-role
-- client (lib/supabase/admin.ts) — no RLS policy admits a direct client
-- insert from anon or an authenticated user at all, on purpose: the rate
-- limiting/Altcha/target-validation in that action is what makes writing
-- one of these rows safe, and RLS can't express "only after those checks
-- passed."

-- Org owner: read + mark-read their own organization-targeted requests.
create policy contact_requests_owner_select on contact_requests
  for select
  using (
    target_type = 'organization'
    and exists (select 1 from organizations o where o.id = contact_requests.target_id and o.owner_user_id = auth.uid())
  );

create policy contact_requests_owner_update on contact_requests
  for update
  using (
    target_type = 'organization'
    and exists (select 1 from organizations o where o.id = contact_requests.target_id and o.owner_user_id = auth.uid())
  )
  with check (
    target_type = 'organization'
    and exists (select 1 from organizations o where o.id = contact_requests.target_id and o.owner_user_id = auth.uid())
  );

-- Admin + Account Manager: read every request, same "operations can see
-- what issuers see" principle as certificates/organizations. Finance
-- deliberately excluded, consistent with every other non-financial staff
-- surface.
create policy contact_requests_staff_select on contact_requests
  for select
  using (is_admin() or is_account_manager());
