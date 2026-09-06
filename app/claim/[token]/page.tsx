import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { ClaimConfirmForm } from './ClaimConfirmForm';

/**
 * /claim/[token] (docs/build-phases.md Phase 8) — a trainee following their
 * claim-link email lands here. `token` is a bare opaque lookup key
 * (lib/trainees/claim-token.ts), so looking it up needs the service-role
 * client — there's no anon-facing RLS read policy for trainees by
 * claim_token (correctly so; the existing policies only cover org-owner,
 * self-claimed, and staff reads, supabase/migrations/0006_trainees.sql). The
 * actual link-up happens in ./actions.ts's claimProfile(), which
 * re-validates the token from scratch rather than trusting this render.
 */
export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;

  if (done) {
    return (
      <ClaimStatus
        title="Profile claimed"
        message="Your Certified Africa profile is now linked to your account. Profile editing tools (photo, bio, contact preferences) are coming soon."
      />
    );
  }

  const admin = createAdminClient();
  const { data: trainee } = await admin
    .from('trainees')
    .select('full_name, claimed, claim_token_expires_at')
    .eq('claim_token', token)
    .maybeSingle();

  if (!trainee) {
    return (
      <ClaimStatus
        title="Link not found"
        message="This claim link is invalid. Check that you copied the full link from your email."
      />
    );
  }
  if (trainee.claimed) {
    return <ClaimStatus title="Already claimed" message="This profile has already been claimed." />;
  }
  if (!trainee.claim_token_expires_at || new Date(trainee.claim_token_expires_at) < new Date()) {
    return (
      <ClaimStatus
        title="Link expired"
        message="This claim link has expired. Contact the organization that issued your certificate for a new one."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-2xl text-certified-navy">Claim your profile</h1>
      <p className="text-certified-muted">
        Hi {trainee.full_name}. Claiming your profile lets you add a photo and bio, control who can contact you, and
        mark yourself open to hire.
      </p>
      {user ? (
        <ClaimConfirmForm token={token} />
      ) : (
        <div className="flex w-full flex-col gap-3">
          <Link href={`/login?next=/claim/${token}`} className="rounded-control bg-certified-navy px-4 py-2 text-white">
            Sign in to claim
          </Link>
          <Link
            href={`/signup?next=/claim/${token}`}
            className="rounded-control border border-certified-border px-4 py-2 text-certified-ink"
          >
            Create an account
          </Link>
        </div>
      )}
    </main>
  );
}

function ClaimStatus({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-2xl text-certified-navy">{title}</h1>
      <p className="text-certified-muted">{message}</p>
    </main>
  );
}
