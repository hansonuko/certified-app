-- Phase 8 item 1 (docs/build-phases.md, docs/session-handoff.md §16): trainee
-- self-claim. Two changes, both to the existing `trainees` table from
-- 0006_trainees.sql — no new table, per that migration's own design (claim
-- mechanics live on the trainee row itself).
--
-- 1. `claim_token_expires_at` — session-handoff.md §16 item 1: `claim_token`
--    has been a bare unique `text` column since 0006 with no expiry tracking.
--    Generated alongside the token at trainee-creation time
--    (lib/trainees/claim-token.ts), checked by app/claim/[token]'s verify
--    action.
--
-- 2. The `guard_trainee_moderation_columns` trigger (0006) currently reads
--    `if not is_staff() then raise exception ...` for any change to
--    is_hidden/flagged_reason/claimed/claimed_by_user_id/claim_token. That
--    blocks staff and nobody else — but the claim-verification action
--    (app/claim/[token]/actions.ts) runs as the claiming trainee, who is
--    never staff, so the very first real write to these columns would trip
--    the guard it's supposed to coexist with. Per session-handoff.md §16
--    item 3's recommended approach ("a dedicated server action using the
--    service-role client... matches this codebase's established pattern"),
--    the intended caller is the service-role client with an explicit
--    ownership/token check in application code (same pattern as
--    certificates/audit_log/jobs) — RLS already lets service-role bypass the
--    USING/WITH CHECK policies above, but this trigger doesn't yet carve out
--    that case, so it still needs updating here.
--
--    `auth.uid() is null` reliably identifies that case: every legitimate
--    non-staff caller that reaches this trigger at all had to first pass one
--    of trainees_owner_all/trainees_self_all (both require auth.uid() to
--    match a real row), so a null auth.uid() only happens for the
--    service-role key, which has no JWT `sub` claim and carries no user
--    session. Application code, not this trigger, remains responsible for
--    checking the claim token / ownership before performing the write — same
--    division of responsibility as every other service-role-only mutation in
--    this schema.
alter table trainees
  add column claim_token_expires_at timestamptz;

create or replace function guard_trainee_moderation_columns()
returns trigger
language plpgsql
as $$
begin
  if not (is_staff() or auth.uid() is null) then
    if new.is_hidden is distinct from old.is_hidden
      or new.flagged_reason is distinct from old.flagged_reason
      or new.claimed is distinct from old.claimed
      or new.claimed_by_user_id is distinct from old.claimed_by_user_id
      or new.claim_token is distinct from old.claim_token
      or new.claim_token_expires_at is distinct from old.claim_token_expires_at then
      raise exception 'moderation and claim-mechanics columns can only be changed by staff or the claim flow';
    end if;
  end if;
  return new;
end;
$$;
