-- Phase 4 schema changes, part 3 of 4 (docs/build-phases.md Phase 4) —
-- opt-in certificate expiry per training program. Split out into its own
-- migration file for the same deadlock-avoidance reason as 0012's header
-- comment explains.
--
-- docs/blueprint.md §11.5 "Certificate expiry — supported as an issuer-level,
-- per-program option (off by default, opt-in for fields like safety
-- recertification)". Null/0 means certificates issued under this program
-- never expire; a positive value means issuance computes
-- certificate.expiry_date = completion_date + this many months.
alter table training_programs add column certificate_validity_months integer
  check (certificate_validity_months is null or certificate_validity_months > 0);
