import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { FREE_TIER_LIMITS, formatBytes, getLiveSupabaseUsage, warningLevel } from '@/lib/usage/free-tier';
import { UsageTile } from './UsageTile';
import { ManualUsageTile } from './ManualUsageTile';

// /staff/finance (docs/build-phases.md Phase 9, docs/roles-permissions.md
// §2 "View cost/usage dashboard" — Admin + Finance only, not Account
// Manager). The early-warning system CLAUDE.md's free-tier discipline asks
// for: usage against each service's free-tier ceiling, with a visual
// warning state as any metric approaches its limit. See lib/usage/free-
// tier.ts for why only Supabase's two metrics are live-read and the other
// three are manual entry.
export default async function FinancePage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'view_cost_usage_dashboard')) redirect('/staff');

  const { databaseBytes, storageBytes } = await getLiveSupabaseUsage();

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl text-certified-navy">Finance</h1>
        <p className="text-sm text-certified-muted">
          Usage against each free-tier ceiling. Every service this project runs on is free-tier during build
          (CLAUDE.md) — this page exists to catch an approaching limit before it becomes an unexpected paid-tier
          surprise.
        </p>
        <Link href="/staff/finance/reports" className="text-sm text-certified-navy underline">
          Export reports (CSV/PDF) →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {databaseBytes === null ? (
          <UsageTile
            label="Supabase database"
            usedLabel=""
            limitLabel=""
            ratio={0}
            level="ok"
            unavailable
            sourceNote="supabase/migrations/0024_usage_metrics_rpc.sql (apply via SQL Editor)"
          />
        ) : (
          <UsageTile
            label="Supabase database"
            usedLabel={formatBytes(databaseBytes)}
            limitLabel={formatBytes(FREE_TIER_LIMITS.supabaseDbBytes)}
            ratio={databaseBytes / FREE_TIER_LIMITS.supabaseDbBytes}
            level={warningLevel(databaseBytes, FREE_TIER_LIMITS.supabaseDbBytes)}
            sourceNote="Live — pg_database_size() via get_database_size_bytes()"
          />
        )}

        {storageBytes === null ? (
          <UsageTile
            label="Supabase storage"
            usedLabel=""
            limitLabel=""
            ratio={0}
            level="ok"
            unavailable
            sourceNote="supabase/migrations/0024_usage_metrics_rpc.sql (apply via SQL Editor)"
          />
        ) : (
          <UsageTile
            label="Supabase storage"
            usedLabel={formatBytes(storageBytes)}
            limitLabel={formatBytes(FREE_TIER_LIMITS.supabaseStorageBytes)}
            ratio={storageBytes / FREE_TIER_LIMITS.supabaseStorageBytes}
            level={warningLevel(storageBytes, FREE_TIER_LIMITS.supabaseStorageBytes)}
            sourceNote="Live — sum of storage.objects.metadata.size via get_storage_size_bytes(), all buckets"
          />
        )}

        <ManualUsageTile
          label="Resend emails (this month)"
          storageKey="finance:resend"
          defaultLimit={FREE_TIER_LIMITS.resendEmailsPerMonth}
          unitLabel="emails"
          sourceNote="Manual — no usage-count endpoint in Resend's public API; check the Resend dashboard"
        />

        <ManualUsageTile
          label="Upstash commands (this month)"
          storageKey="finance:upstash"
          defaultLimit={FREE_TIER_LIMITS.upstashCommandsPerMonth}
          unitLabel="commands"
          sourceNote="Manual — command count needs Upstash's management API, not the data-plane REST credentials this project has; Upstash is also still unconfigured (docs/session-handoff.md §3)"
        />

        <ManualUsageTile
          label="Vercel invocations"
          storageKey="finance:vercel"
          defaultLimit={FREE_TIER_LIMITS.vercelInvocations}
          unitLabel="invocations"
          sourceNote="Manual — needs a Vercel API token this project doesn't have configured; check the Vercel dashboard"
        />
      </div>
    </main>
  );
}
