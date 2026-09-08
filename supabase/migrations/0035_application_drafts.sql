-- "Save and continue later" for the /apply wizard (user-requested fix
-- alongside the /apply error investigation). Deliberately a separate
-- table, not a `status = 'draft'` row on `organizations` itself — the
-- organizations table's existence today means "a real application was
-- submitted" everywhere it's read (staff review queues, AM round-robin
-- assignment, the directory, RC-number uniqueness) and teaching all of
-- that to filter out drafts would be a much larger, riskier change than
-- just keeping pre-submission scratch state somewhere nobody else reads
-- from. This table is exactly that: one row per applicant-in-progress,
-- read/written only by its own owner, deleted once they actually submit
-- (app/(auth)/apply/actions.ts).

create table application_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  form_data jsonb not null default '{}'::jsonb, -- raw text/radio/checkbox field values, keyed by form field name
  step_index integer not null default 0,
  identification_document_path text, -- storage path, application-documents bucket — same re-encoded upload as a live submission
  proof_of_operation_path text,
  updated_at timestamptz not null default now()
);

comment on table application_drafts is
  'Autosaved /apply wizard progress (save-and-continue-later). Plain '
  'scratch state, never a real Application and never staff-visible — '
  'deleted the moment the applicant actually submits.';

alter table application_drafts enable row level security;

-- Owner-only, full stop. No staff policy: a draft isn''t something anyone
-- reviews, and it holds the same KYC-adjacent document paths the real
-- application would, so there''s no reason to widen its visibility beyond
-- the one person it belongs to.
create policy application_drafts_owner_all on application_drafts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
