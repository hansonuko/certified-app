'use client';

import { useEffect, useState } from 'react';

type StoredUsage = { used?: number; limit?: number };

function readStored(key: string): StoredUsage {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as StoredUsage) : {};
  } catch {
    return {};
  }
}

/**
 * Builds the two download links with the current browser's manually-entered
 * Resend/Upstash/Vercel figures (app/staff/(console)/finance/
 * ManualUsageTile.tsx's localStorage keys) attached as query params — the
 * API route (app/api/staff/finance/reports/route.tsx) has no other way to
 * see them, since they were never persisted server-side (lib/usage/free-
 * tier.ts's header comment explains why). A plain server-rendered link
 * would always show "not entered" for all three.
 */
export function ReportDownloadLinks() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const resend = readStored('finance:resend');
    const upstash = readStored('finance:upstash');
    const vercel = readStored('finance:vercel');
    const params = new URLSearchParams();
    if (resend.used !== undefined) params.set('resendUsed', String(resend.used));
    if (resend.limit !== undefined) params.set('resendLimit', String(resend.limit));
    if (upstash.used !== undefined) params.set('upstashUsed', String(upstash.used));
    if (upstash.limit !== undefined) params.set('upstashLimit', String(upstash.limit));
    if (vercel.used !== undefined) params.set('vercelUsed', String(vercel.used));
    if (vercel.limit !== undefined) params.set('vercelLimit', String(vercel.limit));
    setQuery(params.toString());
  }, []);

  const base = '/api/staff/finance/reports';
  return (
    <div className="flex gap-3">
      <a
        href={`${base}?format=csv${query ? `&${query}` : ''}`}
        className="rounded-control bg-certified-navy px-4 py-2 text-sm text-white"
      >
        Download CSV
      </a>
      <a
        href={`${base}?format=pdf${query ? `&${query}` : ''}`}
        className="rounded-control border border-certified-border px-4 py-2 text-sm text-certified-navy"
      >
        Download PDF
      </a>
    </div>
  );
}
