// Minimal, dependency-free RFC4180-ish CSV parser/writer (Phase 7 bulk
// issuance, docs/build-phases.md). No external package pulled in for this —
// the format need here is plain (quoted fields, escaped quotes, comma
// delimiter) and a hand-rolled parser is small enough to just own outright
// rather than take on a dependency for. Runs identically in the browser
// (client-side instant preview) and in a server action (re-validation) —
// no Node-specific or DOM-specific APIs.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ',') {
      pushField();
      i++;
      continue;
    }
    if (char === '\r') {
      i++;
      continue;
    } // normalize CRLF -> LF
    if (char === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop a trailing fully-empty row (e.g. a file ending in a blank line).
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

function escapeCsvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(headers: readonly string[], rows: (string | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push(row.map((v) => escapeCsvField(v ?? '')).join(','));
  }
  return lines.join('\r\n');
}
