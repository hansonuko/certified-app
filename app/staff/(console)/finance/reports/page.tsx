import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import { getIssuanceVolumeByMonth, getOrganizationGrowth } from '@/lib/reports/finance-data';
import { ReportDownloadLinks } from './ReportDownloadLinks';

// /staff/finance/reports (docs/build-phases.md Phase 9, item 2). Admin +
// Finance only, same gate as /staff/finance itself.
export default async function FinanceReportsPage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'export_financial_reports')) redirect('/staff');

  const [issuance, orgGrowth] = await Promise.all([getIssuanceVolumeByMonth(), getOrganizationGrowth()]);

  return (
    <main className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/staff/finance" className="text-sm text-certified-navy underline">
          ← Finance
        </Link>
        <h1 className="font-display text-2xl text-certified-navy">Reports</h1>
        <p className="text-sm text-certified-muted">
          Issuance volume, organization growth, and the current usage snapshot from /staff/finance — exportable as
          CSV or PDF.
        </p>
      </div>

      <ReportDownloadLinks />

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Issuance volume by month</h2>
        {issuance.length === 0 ? (
          <p className="text-certified-muted">No certificates issued yet.</p>
        ) : (
          <table className="w-full max-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Month</th>
                <th className="py-2">Status</th>
                <th className="py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {issuance.map((row, i) => (
                <tr key={i} className="border-b border-certified-border">
                  <td className="py-2">{row.issue_month}</td>
                  <td className="py-2">{row.status}</td>
                  <td className="py-2">{row.certificate_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Organization growth</h2>
        {orgGrowth.length === 0 ? (
          <p className="text-certified-muted">No organizations yet.</p>
        ) : (
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Organization</th>
                <th className="py-2">Status</th>
                <th className="py-2">Joined</th>
                <th className="py-2">Certificates issued</th>
              </tr>
            </thead>
            <tbody>
              {orgGrowth.map((row) => (
                <tr key={row.id} className="border-b border-certified-border">
                  <td className="py-2">{row.name}</td>
                  <td className="py-2">{row.status}</td>
                  <td className="py-2">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="py-2">{row.certificates_issued}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
