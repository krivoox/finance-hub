/**
 * Operative currencies for finance accounts (ADR-006 / SPEC-03).
 *
 * Distinct from profile `SUPPORTED_CURRENCIES` (auth) — accounts only allow
 * ARS and USD in v1.
 */

export const ACCOUNT_CURRENCIES = ["ARS", "USD"] as const;

export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export function isAccountCurrency(code: string): code is AccountCurrency {
  return (ACCOUNT_CURRENCIES as readonly string[]).includes(code);
}
