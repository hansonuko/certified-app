import { parseCsv, toCsv } from '../csv';

// Shared, pure validation for CSV bulk cohort issuance (docs/build-phases.md
// Phase 7, docs/blueprint.md §3.3B). Deliberately framework-agnostic (no
// React, no Node-only APIs) so the exact same rules run in two places:
// client-side for the instant upload preview, and again server-side in the
// enqueue action before anything is trusted into the jobs table — a client
// can always resubmit hand-edited JSON, so the server re-validates from
// scratch rather than trusting the browser's own pass.

export const CSV_HEADERS = [
  'full_name',
  'completion_date',
  'grade',
  'phone',
  'email',
  'bio',
  'country',
  'region',
  'locality',
] as const;

export type BulkRow = {
  rowIndex: number; // 1-based, counting only data rows (header excluded)
  full_name: string;
  completion_date: string;
  grade: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  country: string | null;
  region: string | null;
  locality: string | null;
  errors: string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_HEADERS = ['full_name', 'completion_date'];

function validateFields(row: Pick<BulkRow, 'full_name' | 'completion_date' | 'email'>): string[] {
  const errors: string[] = [];
  if (!row.full_name.trim()) errors.push('Full name is required.');
  if (!row.completion_date) {
    errors.push('Completion date is required.');
  } else if (!DATE_RE.test(row.completion_date) || Number.isNaN(new Date(`${row.completion_date}T00:00:00Z`).getTime())) {
    errors.push('Completion date must be in YYYY-MM-DD format.');
  }
  if (row.email && !row.email.includes('@')) errors.push('Email does not look valid.');
  return errors;
}

/** In-batch duplicate detection (docs/blueprint.md §6: "duplicate detection (name + ... + date)"). */
function flagDuplicates(rows: BulkRow[]): void {
  const seen = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.full_name.trim() || !row.completion_date) continue; // already flagged on its own
    const key = `${row.full_name.trim().toLowerCase()}|${row.completion_date}`;
    const list = seen.get(key) ?? [];
    list.push(row.rowIndex);
    seen.set(key, list);
  }
  const duplicateRowIndices = new Set([...seen.values()].filter((idxs) => idxs.length > 1).flat());
  for (const row of rows) {
    if (duplicateRowIndices.has(row.rowIndex)) {
      row.errors.push('Duplicate row in this file (same name + completion date).');
    }
  }
}

export function parseAndValidateCsv(text: string): { rows: BulkRow[]; headerError: string | null } {
  const records = parseCsv(text.trim());
  if (records.length === 0) {
    return { rows: [], headerError: 'The file is empty.' };
  }

  const header = records[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return { rows: [], headerError: `Missing required column(s): ${missing.join(', ')}.` };
  }

  const colIndex = (name: string) => header.indexOf(name);
  const dataRecords = records.slice(1).filter((r) => r.some((cell) => cell.trim() !== ''));

  const rows: BulkRow[] = dataRecords.map((record, i) => {
    const get = (name: string): string | null => {
      const idx = colIndex(name);
      if (idx === -1) return null;
      return record[idx]?.trim() || null;
    };

    const full_name = get('full_name') ?? '';
    const completion_date = get('completion_date') ?? '';
    const email = get('email');

    return {
      rowIndex: i + 1,
      full_name,
      completion_date,
      grade: get('grade'),
      phone: get('phone'),
      email,
      bio: get('bio'),
      country: get('country'),
      region: get('region'),
      locality: get('locality'),
      errors: validateFields({ full_name, completion_date, email }),
    };
  });

  flagDuplicates(rows);
  return { rows, headerError: null };
}

/**
 * Server-side re-check of already-parsed rows (the enqueue action's input —
 * the client sends structured JSON, not raw CSV text, so this re-runs the
 * same field + duplicate rules from scratch rather than trusting whatever
 * the browser filtered out).
 */
export function revalidateRows(rows: BulkRow[]): BulkRow[] {
  const revalidated = rows.map((row) => ({
    ...row,
    errors: validateFields(row),
  }));
  flagDuplicates(revalidated);
  return revalidated;
}

export function csvTemplate(): string {
  return toCsv(CSV_HEADERS, [
    [
      'Jane Doe',
      '2026-03-15',
      'Distinction',
      '+2348012345678',
      'jane@example.com',
      'Completed the welding fundamentals course.',
      'Nigeria',
      'Lagos',
      'Ikeja',
    ],
  ]);
}
