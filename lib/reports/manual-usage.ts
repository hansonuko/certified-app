/**
 * The three manual-entry usage metrics (Resend/Upstash/Vercel) live only in
 * the viewing browser's localStorage (app/staff/(console)/finance/
 * ManualUsageTile.tsx) — a server-rendered report has no access to that, so
 * the reports page passes whatever's currently entered as query params on
 * the download link. Absence just means "not entered yet", not an error.
 */
export type ManualUsageValues = {
  supabaseDb: string | null;
  supabaseStorage: string | null;
  resendUsed: number | null;
  resendLimit: number | null;
  upstashUsed: number | null;
  upstashLimit: number | null;
  vercelUsed: number | null;
  vercelLimit: number | null;
};

function parseIntOrNull(value: string | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseManualUsageFromSearchParams(searchParams: URLSearchParams): Omit<
  ManualUsageValues,
  'supabaseDb' | 'supabaseStorage'
> {
  return {
    resendUsed: parseIntOrNull(searchParams.get('resendUsed')),
    resendLimit: parseIntOrNull(searchParams.get('resendLimit')),
    upstashUsed: parseIntOrNull(searchParams.get('upstashUsed')),
    upstashLimit: parseIntOrNull(searchParams.get('upstashLimit')),
    vercelUsed: parseIntOrNull(searchParams.get('vercelUsed')),
    vercelLimit: parseIntOrNull(searchParams.get('vercelLimit')),
  };
}
