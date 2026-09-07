/**
 * Minimal CSV serializer — no CSV library is a dependency yet (bulk
 * issuance's upload path, app/dashboard/programs/[id]/bulk-issue, parses
 * CSV by hand too), and generating one is small enough not to justify
 * adding one for this.
 */
function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }
  // CRLF per RFC 4180 — plays safest with Excel, the most likely opener.
  return lines.join('\r\n') + '\r\n';
}
