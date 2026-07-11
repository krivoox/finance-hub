/**
 * Pure domain types for the Accounts feature (SPEC-03).
 *
 * They mirror the persistence shape but stay free of Prisma imports so the
 * domain can run in the browser and in Vitest without a database.
 */

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "cash",
  "credit_card",
  "virtual_wallet",
  "other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return (
    typeof value === "string" &&
    (ACCOUNT_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Signed representation of an account's current balance. Unlike the `Money`
 * value object (which is strictly non-negative), a derived balance may be
 * negative when a regular account is overdrawn.
 *
 * Credit cards follow the convention documented in SPEC-03 §5: a positive
 * `amountCents` represents the amount owed.
 */
export type AccountBalance = {
  readonly amountCents: number;
  readonly currency: string;
};
