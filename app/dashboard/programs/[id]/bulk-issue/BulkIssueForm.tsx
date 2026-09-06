'use client';

import { useActionState, useState } from 'react';
import { parseAndValidateCsv, csvTemplate, type BulkRow } from '@/lib/bulk-issuance/validate';
import { enqueueBulkIssuance, type BulkIssueFormState } from './actions';

function downloadTemplate() {
  const blob = new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'certified-africa-bulk-issuance-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkIssueForm({ programId }: { programId: string }) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [state, formAction, pending] = useActionState<BulkIssueFormState, FormData>(enqueueBulkIssuance, null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const result = parseAndValidateCsv(text);
    setRows(result.rows);
    setHeaderError(result.headerError);
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidCount = rows.length - validRows.length;
  const canSubmit = !headerError && validRows.length > 0 && consent && !pending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-card border border-certified-border bg-certified-surface p-5">
        <p className="text-sm text-certified-ink">
          1. Download the CSV template, fill it in (one row per trainee), then upload it below.
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="self-start rounded-control border border-certified-border px-4 py-2 text-sm text-certified-ink"
        >
          Download CSV template
        </button>

        <label className="flex flex-col gap-1 text-sm text-certified-ink">
          2. Upload your completed CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="rounded-control border border-certified-border px-3 py-2"
          />
        </label>
      </div>

      {headerError ? <p className="text-sm text-certified-danger">{headerError}</p> : null}

      {rows.length > 0 && !headerError ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-certified-ink">
            <strong>{fileName}</strong>: {validRows.length} row{validRows.length === 1 ? '' : 's'} ready to issue
            {invalidCount > 0 ? `, ${invalidCount} row${invalidCount === 1 ? '' : 's'} with errors (will be skipped)` : ''}.
          </p>

          <div className="max-h-80 overflow-auto rounded-card border border-certified-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-certified-surface-2">
                <tr>
                  <th className="p-2">Row</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Completion date</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowIndex} className="border-t border-certified-border">
                    <td className="p-2">{row.rowIndex}</td>
                    <td className="p-2">{row.full_name || <em className="text-certified-muted">(blank)</em>}</td>
                    <td className="p-2">{row.completion_date || <em className="text-certified-muted">(blank)</em>}</td>
                    <td className="p-2">
                      {row.errors.length === 0 ? (
                        <span className="text-certified-success">OK</span>
                      ) : (
                        <span className="text-certified-danger">{row.errors.join(' ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="program_id" value={programId} />
            <input type="hidden" name="rows" value={JSON.stringify(validRows)} />

            <label className="flex items-start gap-2 text-sm text-certified-ink">
              <input
                type="checkbox"
                name="consent_confirmed"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              I confirm every trainee in this batch has consented to a public profile.
            </label>

            {state?.error ? <p className="text-sm text-certified-danger">{state.error}</p> : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="self-start rounded-control bg-certified-navy px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {pending ? 'Queuing…' : `Issue ${validRows.length} certificate${validRows.length === 1 ? '' : 's'}`}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
