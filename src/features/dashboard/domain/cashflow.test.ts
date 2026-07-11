import { describe, expect, it } from "vitest";
import { computeMonthlyCashflow } from "./cashflow";
import type { DashboardTransaction } from "./types";

const PERIOD_START = new Date("2026-07-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-08-01T00:00:00.000Z");

function tx(overrides: Partial<DashboardTransaction>): DashboardTransaction {
  return {
    type: "expense",
    amountCents: 1_000,
    currency: "ARS",
    occurredOn: new Date("2026-07-15T00:00:00.000Z"),
    createdAt: new Date("2026-07-15T12:00:00.000Z"),
    ...overrides,
  };
}

describe("computeMonthlyCashflow — SPEC-12 §4 / T-02", () => {
  it("returns zeros for an empty list (T-01)", () => {
    expect(
      computeMonthlyCashflow([], PERIOD_START, PERIOD_END, "ARS"),
    ).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      currency: "ARS",
    });
  });

  it("sums income and expense of the period; net = income − expense (T-02)", () => {
    const txs: DashboardTransaction[] = [
      tx({ type: "income", amountCents: 100_000 }),
      tx({ type: "expense", amountCents: 40_000 }),
      tx({
        type: "expense",
        amountCents: 999,
        occurredOn: new Date("2026-06-30T00:00:00.000Z"),
      }),
    ];
    const cashflow = computeMonthlyCashflow(
      txs,
      PERIOD_START,
      PERIOD_END,
      "ARS",
    );
    expect(cashflow).toEqual({
      incomeCents: 100_000,
      expenseCents: 40_000,
      netCents: 60_000,
      currency: "ARS",
    });
  });

  it("excludes transfers from income and expense", () => {
    const txs: DashboardTransaction[] = [
      tx({ type: "income", amountCents: 50_000 }),
      tx({ type: "transfer", amountCents: 25_000 }),
      tx({ type: "expense", amountCents: 10_000 }),
    ];
    const cashflow = computeMonthlyCashflow(
      txs,
      PERIOD_START,
      PERIOD_END,
      "ARS",
    );
    expect(cashflow.incomeCents).toBe(50_000);
    expect(cashflow.expenseCents).toBe(10_000);
    expect(cashflow.netCents).toBe(40_000);
  });

  it("uses a half-open [start, end) window: start is inclusive, end is exclusive", () => {
    const txs: DashboardTransaction[] = [
      tx({
        type: "income",
        amountCents: 111,
        occurredOn: new Date("2026-06-30T23:59:59.999Z"),
      }),
      tx({
        type: "income",
        amountCents: 222,
        occurredOn: PERIOD_START,
      }),
      tx({
        type: "expense",
        amountCents: 333,
        occurredOn: new Date("2026-07-31T00:00:00.000Z"),
      }),
      tx({
        type: "expense",
        amountCents: 444,
        occurredOn: PERIOD_END,
      }),
    ];
    const cashflow = computeMonthlyCashflow(
      txs,
      PERIOD_START,
      PERIOD_END,
      "ARS",
    );
    expect(cashflow.incomeCents).toBe(222);
    expect(cashflow.expenseCents).toBe(333);
  });

  it("skips transactions with a different currency than requested", () => {
    const txs: DashboardTransaction[] = [
      tx({ type: "income", amountCents: 100_000 }),
      tx({ type: "expense", amountCents: 999, currency: "USD" }),
    ];
    const cashflow = computeMonthlyCashflow(
      txs,
      PERIOD_START,
      PERIOD_END,
      "ARS",
    );
    expect(cashflow.incomeCents).toBe(100_000);
    expect(cashflow.expenseCents).toBe(0);
    expect(cashflow.netCents).toBe(100_000);
  });
});
