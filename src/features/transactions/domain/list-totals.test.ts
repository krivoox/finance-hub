import { describe, expect, it } from "vitest";

import {
  presentListTotals,
  summarizeListAmounts,
} from "./list-totals";

describe("summarizeListAmounts (SPEC-05 §4.6)", () => {
  it("buckets income and expense per currency without mixing ARS/USD", () => {
    const result = summarizeListAmounts([
      { type: "expense", amountCents: 1_000, currency: "ARS" },
      { type: "expense", amountCents: 500, currency: "USD" },
      { type: "income", amountCents: 10_000, currency: "ARS" },
      { type: "expense", amountCents: 2_000, currency: "ARS" },
    ]);

    expect(result).toEqual([
      {
        currency: "ARS",
        incomeCents: 10_000,
        expenseCents: 3_000,
        transferCents: 0,
        fxDebitCents: 0,
        fxCreditCents: 0,
        count: 3,
        incomeCount: 1,
        expenseCount: 2,
        transferCount: 0,
        fxCount: 0,
      },
      {
        currency: "USD",
        incomeCents: 0,
        expenseCents: 500,
        transferCents: 0,
        fxDebitCents: 0,
        fxCreditCents: 0,
        count: 1,
        incomeCount: 0,
        expenseCount: 1,
        transferCount: 0,
        fxCount: 0,
      },
    ]);
  });

  it("tracks transfers separately from cashflow buckets", () => {
    const result = summarizeListAmounts([
      { type: "transfer", amountCents: 4_000, currency: "ARS" },
      { type: "expense", amountCents: 1_000, currency: "ARS" },
    ]);

    expect(result).toEqual([
      {
        currency: "ARS",
        incomeCents: 0,
        expenseCents: 1_000,
        transferCents: 4_000,
        fxDebitCents: 0,
        fxCreditCents: 0,
        count: 2,
        incomeCount: 0,
        expenseCount: 1,
        transferCount: 1,
        fxCount: 0,
      },
    ]);
  });

  it("tracks fx legs separately (not cashflow)", () => {
    const result = summarizeListAmounts([
      { type: "fx_debit", amountCents: 100, currency: "USD" },
      { type: "fx_credit", amountCents: 90_000, currency: "ARS" },
    ]);

    expect(result).toEqual([
      {
        currency: "ARS",
        incomeCents: 0,
        expenseCents: 0,
        transferCents: 0,
        fxDebitCents: 0,
        fxCreditCents: 90_000,
        count: 1,
        incomeCount: 0,
        expenseCount: 0,
        transferCount: 0,
        fxCount: 1,
      },
      {
        currency: "USD",
        incomeCents: 0,
        expenseCents: 0,
        transferCents: 0,
        fxDebitCents: 100,
        fxCreditCents: 0,
        count: 1,
        incomeCount: 0,
        expenseCount: 0,
        transferCount: 0,
        fxCount: 1,
      },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(summarizeListAmounts([])).toEqual([]);
  });

  it("folds groupBy rows using aggregate count", () => {
    const result = summarizeListAmounts([
      { type: "expense", amountCents: 3_000, currency: "ARS", count: 2 },
      { type: "income", amountCents: 10_000, currency: "ARS", count: 1 },
      { type: "expense", amountCents: 500, currency: "USD", count: 1 },
    ]);

    expect(result.find((r) => r.currency === "ARS")).toMatchObject({
      expenseCents: 3_000,
      incomeCents: 10_000,
      count: 3,
      incomeCount: 1,
      expenseCount: 2,
    });
  });
});

describe("presentListTotals (SPEC-05 §4.6 / KRI-34)", () => {
  const mixed = summarizeListAmounts([
    { type: "expense", amountCents: 3_000, currency: "ARS" },
    { type: "income", amountCents: 10_000, currency: "ARS" },
    { type: "transfer", amountCents: 500, currency: "ARS" },
    { type: "expense", amountCents: 200, currency: "USD" },
  ]);

  it("expense filter → SUMA of expenses only per currency", () => {
    expect(presentListTotals(mixed, "expense")).toEqual({
      mode: "expense",
      movementCount: 2,
      lines: [
        { currency: "ARS", amountCents: 3_000 },
        { currency: "USD", amountCents: 200 },
      ],
    });
  });

  it("income filter → SUMA of incomes only", () => {
    expect(presentListTotals(mixed, "income")).toEqual({
      mode: "income",
      movementCount: 1,
      lines: [{ currency: "ARS", amountCents: 10_000 }],
    });
  });

  it("transfer filter → SUMA of transfers only", () => {
    expect(presentListTotals(mixed, "transfer")).toEqual({
      mode: "transfer",
      movementCount: 1,
      lines: [{ currency: "ARS", amountCents: 500 }],
    });
  });

  it("type=all → breakdown income/expense/net; excludes transfer from amounts and count", () => {
    expect(presentListTotals(mixed, "all")).toEqual({
      mode: "breakdown",
      movementCount: 3,
      byCurrency: [
        {
          currency: "ARS",
          incomeCents: 10_000,
          expenseCents: 3_000,
          netCents: 7_000,
        },
        {
          currency: "USD",
          incomeCents: 0,
          expenseCents: 200,
          netCents: -200,
        },
      ],
    });
  });

  it("omits currencies with zero relevant amounts for the mode", () => {
    const onlyTransfer = summarizeListAmounts([
      { type: "transfer", amountCents: 100, currency: "ARS" },
    ]);
    expect(presentListTotals(onlyTransfer, "expense")).toEqual({
      mode: "expense",
      movementCount: 0,
      lines: [],
    });
  });

  it("T-20b: type=all with only transfers has no cashflow totals (no transfer fallback)", () => {
    const onlyTransfer = summarizeListAmounts([
      { type: "transfer", amountCents: 100, currency: "ARS" },
    ]);
    expect(presentListTotals(onlyTransfer, "all")).toEqual({
      mode: "breakdown",
      movementCount: 0,
      byCurrency: [],
    });
  });
});
