import { describe, expect, it } from 'vitest';
import { assertBootstrapAllowed, BootstrapRefusedError } from './bootstrap-admin-guard';

describe('assertBootstrapAllowed', () => {
  it('refuses when admin_users already has a row, even with the correct secret', () => {
    expect(() =>
      assertBootstrapAllowed({ adminCount: 1, providedSecret: 'right', expectedSecret: 'right' }),
    ).toThrow(BootstrapRefusedError);
  });

  it('refuses when admin_users has many rows, even with the correct secret', () => {
    expect(() =>
      assertBootstrapAllowed({ adminCount: 5, providedSecret: 'right', expectedSecret: 'right' }),
    ).toThrow(BootstrapRefusedError);
  });

  it('refuses when ADMIN_BOOTSTRAP_SECRET is not configured at all', () => {
    expect(() =>
      assertBootstrapAllowed({ adminCount: 0, providedSecret: 'anything', expectedSecret: undefined }),
    ).toThrow(BootstrapRefusedError);
  });

  it('refuses when the count is zero but no secret was provided', () => {
    expect(() =>
      assertBootstrapAllowed({ adminCount: 0, providedSecret: undefined, expectedSecret: 'right' }),
    ).toThrow(BootstrapRefusedError);
  });

  it('refuses when the count is zero but the provided secret does not match', () => {
    expect(() =>
      assertBootstrapAllowed({ adminCount: 0, providedSecret: 'wrong', expectedSecret: 'right' }),
    ).toThrow(BootstrapRefusedError);
  });

  it('allows when the count is zero and the secret matches', () => {
    expect(() =>
      assertBootstrapAllowed({ adminCount: 0, providedSecret: 'right', expectedSecret: 'right' }),
    ).not.toThrow();
  });
});
