import { describe, expect, it } from "vitest";

import { signedLedgerAmountCents } from "./ledger-amount";

describe("signedLedgerAmountCents (KRI-34)", () => {
  it("incomes are positive and expenses are negative", () => {
    expect(signedLedgerAmountCents("income", 1_000)).toBe(1_000);
    expect(signedLedgerAmountCents("expense", 1_000)).toBe(-1_000);
  });

  it("fx credit follows income polarity; fx debit follows expense", () => {
    expect(signedLedgerAmountCents("fx_credit", 500)).toBe(500);
    expect(signedLedgerAmountCents("fx_debit", 500)).toBe(-500);
  });

  it("transfers keep the stored positive amount (not an expense)", () => {
    expect(signedLedgerAmountCents("transfer", 4_000)).toBe(4_000);
  });
});
