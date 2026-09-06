import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { advanceJob, pickNextPendingJobId } from '@/lib/bulk-issuance/processor';

// Vercel Cron target (docs/build-phases.md Phase 7 — "a jobs table and a
// Vercel Cron-triggered processor... rather than a single long-running
// request"). See vercel.json for the schedule.
//
// Note on Vercel's free Hobby tier: Cron there is limited to at most once a
// day, not the frequent tick this route is written to handle gracefully —
// lib/bulk-issuance/processor.ts's advanceJob() is also called
// opportunistically from the issuer's own job status page for exactly that
// reason, so a queued batch isn't stuck for a very long time waiting on a
// once-daily Cron with nobody watching. This route is still the correct,
// deploy-and-forget mechanism for whenever the issuer isn't looking at the
// status page, and behaves the same on any tier/frequency.
//
// Protected by CRON_SECRET (.env.example) — Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on its own Cron invocations once
// that env var is set on the project; this route rejects anything else, so
// it can't be used by an outsider to trigger privileged issuance work.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const jobId = await pickNextPendingJobId(admin);
  if (!jobId) {
    return NextResponse.json({ message: 'No pending bulk-issuance jobs.' });
  }

  const result = await advanceJob(admin, jobId);
  return NextResponse.json({ jobId, ...result });
}
