import { describe, expect, it } from 'vitest';
import { parseAndValidateCsv, revalidateRows, csvTemplate } from './validate';

describe('parseAndValidateCsv', () => {
  it('flags a missing required column in the header', () => {
    const { headerError } = parseAndValidateCsv('full_name,grade\nJane Doe,Distinction\n');
    expect(headerError).toMatch(/completion_date/);
  });

  it('flags an empty file', () => {
    const { headerError } = parseAndValidateCsv('');
    expect(headerError).toMatch(/empty/);
  });

  it('accepts a valid row with only the required columns present', () => {
    const { rows, headerError } = parseAndValidateCsv('full_name,completion_date\nJane Doe,2026-03-15\n');
    expect(headerError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].errors).toEqual([]);
  });

  it('flags a blank name and a badly formatted date', () => {
    const { rows } = parseAndValidateCsv('full_name,completion_date\n,15/03/2026\n');
    expect(rows[0].errors).toContain('Full name is required.');
    expect(rows[0].errors.some((e) => e.includes('YYYY-MM-DD'))).toBe(true);
  });

  it('flags an obviously invalid email without rejecting the whole row', () => {
    const { rows } = parseAndValidateCsv('full_name,completion_date,email\nJane Doe,2026-03-15,not-an-email\n');
    expect(rows[0].errors).toContain('Email does not look valid.');
  });

  it('flags in-batch duplicates by name + completion date, both occurrences', () => {
    const { rows } = parseAndValidateCsv(
      'full_name,completion_date\nJane Doe,2026-03-15\nJane Doe,2026-03-15\nJohn Smith,2026-03-15\n',
    );
    expect(rows[0].errors.some((e) => e.includes('Duplicate'))).toBe(true);
    expect(rows[1].errors.some((e) => e.includes('Duplicate'))).toBe(true);
    expect(rows[2].errors).toEqual([]);
  });

  it('skips fully blank trailing rows rather than treating them as empty records', () => {
    const { rows } = parseAndValidateCsv('full_name,completion_date\nJane Doe,2026-03-15\n\n');
    expect(rows).toHaveLength(1);
  });

  it('the downloadable template itself parses clean with zero errors', () => {
    const { rows, headerError } = parseAndValidateCsv(csvTemplate());
    expect(headerError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].errors).toEqual([]);
  });
});

describe('revalidateRows', () => {
  it('re-derives errors from scratch rather than trusting a tampered client-supplied errors array', () => {
    const tampered = [
      { rowIndex: 1, full_name: '', completion_date: '2026-03-15', grade: null, phone: null, email: null, bio: null, country: null, region: null, locality: null, errors: [] },
    ];
    const result = revalidateRows(tampered);
    expect(result[0].errors).toContain('Full name is required.');
  });
});
