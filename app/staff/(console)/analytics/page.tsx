import { redirect } from 'next/navigation';
import { requireStaffSession } from '@/lib/auth/staff';
import { can } from '@/lib/permissions';
import {
  getIssuanceVolumeByMonth,
  getApprovalsRejectionsByMonth,
  getTopTrainingFields,
  getGeographicSpread,
  getIssuanceAnomalies,
} from '@/lib/analytics/operational';

// /staff/analytics (docs/build-phases.md Phase 9, item 4; docs/blueprint.md
// §9). Admin full, Account Manager read-only — "read-only" here just means
// no actions exist on this page at all (it's pure display), not a reduced
// data set: view_operational_analytics isn't in lib/permissions.ts's
// SCOPED_ACTIONS, so both roles see the same platform-wide numbers.
export default async function AnalyticsPage() {
  const { role } = await requireStaffSession();
  if (!can(role, 'view_operational_analytics')) redirect('/staff');

  const [issuance, decisions, topFields, geoSpread, anomalies] = await Promise.all([
    getIssuanceVolumeByMonth(),
    getApprovalsRejectionsByMonth(),
    getTopTrainingFields(),
    getGeographicSpread(),
    getIssuanceAnomalies(),
  ]);

  return (
    <main className="flex flex-col gap-8 p-8">
      <h1 className="font-display text-2xl text-certified-navy">Analytics</h1>

      {anomalies.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-card border border-certified-danger p-6">
          <h2 className="font-display text-lg text-certified-danger">Issuance anomalies</h2>
          <p className="text-sm text-certified-muted">
            Orgs issuing at least 3× their own historical monthly average this month (docs/blueprint.md §6&apos;s
            issuer-account-compromise mitigation) — worth a look, not necessarily wrongdoing.
          </p>
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Organization</th>
                <th className="py-2">Month</th>
                <th className="py-2">Count</th>
                <th className="py-2">Their own average</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map((a) => (
                <tr key={a.orgId} className="border-b border-certified-border">
                  <td className="py-2">{a.orgName}</td>
                  <td className="py-2">{a.month}</td>
                  <td className="py-2 font-semibold text-certified-danger">{a.count}</td>
                  <td className="py-2">{a.averageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

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
                  <td className="py-2">{row.month}</td>
                  <td className="py-2">{row.status}</td>
                  <td className="py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-certified-navy">Approvals / rejections by month</h2>
        {decisions.length === 0 ? (
          <p className="text-certified-muted">No application decisions yet.</p>
        ) : (
          <table className="w-full max-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-certified-border text-certified-muted">
                <th className="py-2">Month</th>
                <th className="py-2">Decision</th>
                <th className="py-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((row, i) => (
                <tr key={i} className="border-b border-certified-border">
                  <td className="py-2">{row.month}</td>
                  <td className="py-2 capitalize">{row.status}</td>
                  <td className="py-2">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-certified-navy">Top training fields</h2>
          {topFields.length === 0 ? (
            <p className="text-certified-muted">No fields recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-certified-border text-certified-muted">
                  <th className="py-2">Field</th>
                  <th className="py-2">Organizations</th>
                </tr>
              </thead>
              <tbody>
                {topFields.map((row) => (
                  <tr key={row.field} className="border-b border-certified-border">
                    <td className="py-2">{row.field}</td>
                    <td className="py-2">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-certified-navy">Geographic spread</h2>
          {geoSpread.length === 0 ? (
            <p className="text-certified-muted">No trainee locations recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-certified-border text-certified-muted">
                  <th className="py-2">Region</th>
                  <th className="py-2">Trainees</th>
                </tr>
              </thead>
              <tbody>
                {geoSpread.map((row) => (
                  <tr key={row.region} className="border-b border-certified-border">
                    <td className="py-2">{row.region}</td>
                    <td className="py-2">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </main>
  );
}
