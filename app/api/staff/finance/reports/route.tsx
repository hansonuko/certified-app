import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { getIssuanceVolumeByMonth, getOrganizationGrowth } from '@/lib/reports/finance-data';
import { toCsv } from '@/lib/reports/csv';
import { getLiveSupabaseUsage, formatBytes } from '@/lib/usage/free-tier';
import { parseManualUsageFromSearchParams } from '@/lib/reports/manual-usage';
import { FinanceReportPdf } from '@/lib/reports/templates/FinanceReportPdf';

// /staff/finance/reports' download endpoint (docs/build-phases.md Phase 9,
// item 2). requireStaffSession() redirects unauthenticated requests to
// /staff/login same as any page; a signed-in staff member without
// export_financial_reports (i.e. Account Manager) gets a plain 403 here
// instead — a redirect doesn't make sense for a route a <a download> link
// hits directly, and CLAUDE.md rule #9 asks for the permission check to
// hold "even if it somehow reaches the route", not for any particular
// response shape.
export async function GET(request: NextRequest) {
  const { role } = await requireStaffSession();
  if (!can(role, 'export_financial_reports')) {
    return NextResponse.json({ error: "You don't have permission to export financial reports." }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'csv';

  const [issuance, orgGrowth, liveUsage] = await Promise.all([
    getIssuanceVolumeByMonth(),
    getOrganizationGrowth(),
    getLiveSupabaseUsage(),
  ]);
  const manual = parseManualUsageFromSearchParams(searchParams);
  const generatedAt = new Date().toISOString();
  const dateStamp = generatedAt.slice(0, 10);

  if (format === 'csv') {
    const sections = [
      '# Issuance volume by month',
      toCsv(
        ['issue_month', 'status', 'certificate_count'],
        issuance.map((r) => [r.issue_month, r.status, r.certificate_count]),
      ),
      '# Organization growth',
      toCsv(
        ['name', 'status', 'created_at', 'certificates_issued'],
        orgGrowth.map((r) => [r.name, r.status, r.created_at, r.certificates_issued]),
      ),
      '# Usage snapshot',
      toCsv(
        ['metric', 'used', 'limit'],
        [
          ['Supabase database', liveUsage.databaseBytes === null ? 'unavailable' : formatBytes(liveUsage.databaseBytes), '500 MB'],
          ['Supabase storage', liveUsage.storageBytes === null ? 'unavailable' : formatBytes(liveUsage.storageBytes), '1 GB'],
          ['Resend emails', manual.resendUsed ?? 'not entered', manual.resendLimit ?? ''],
          ['Upstash commands', manual.upstashUsed ?? 'not entered', manual.upstashLimit ?? ''],
          ['Vercel invocations', manual.vercelUsed ?? 'not entered', manual.vercelLimit ?? ''],
        ],
      ),
    ];
    return new NextResponse(sections.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="certified-africa-finance-report-${dateStamp}.csv"`,
      },
    });
  }

  const pdfBuffer = await renderToBuffer(
    <FinanceReportPdf
      generatedAt={new Date(generatedAt).toLocaleString()}
      issuance={issuance}
      orgGrowth={orgGrowth}
      manualUsage={{
        supabaseDb: liveUsage.databaseBytes === null ? null : formatBytes(liveUsage.databaseBytes),
        supabaseStorage: liveUsage.storageBytes === null ? null : formatBytes(liveUsage.storageBytes),
        ...manual,
      }}
    />,
  );
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certified-africa-finance-report-${dateStamp}.pdf"`,
    },
  });
}
