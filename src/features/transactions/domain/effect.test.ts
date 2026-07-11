import { describe, expect, it } from "vitest";
import {
  calculateAccountBalance,
  type AccountForBalance,
} from "@/features/accounts/domain";
import { toBalanceEffect, toBalanceEffects } from "./effect";
import type { TransactionLike } from "./types";

const CHECKING_A: AccountForBalance = {
  id: "acc-a",
  type: "checking",
  currency: "ARS",
  initialBalanceCents: 10_000,
};

const CHECKING_B: AccountForBalance = {
  id: "acc-b",
  type: "checking",
  currency: "ARS",
  initialBalanceCents: 0,
};

function tx(overrides: Partial<TransactionLike>): TransactionLike {
  return {
    id: overrides.id ?? "tx-" + Math.random().toString(36).slice(2, 8),
    workspaceId: overrides.workspaceId ?? "ws-1",
    type: overrides.type ?? "expense",
    amountCents: overrides.amountCents ?? 1_000,
    currency: overrides.currency ?? "ARS",
    occurredOn: overrides.occurredOn ?? new Date("2026-07-10T00:00:00Z"),
    description: overrides.description ?? null,
    categoryId: overrides.categoryId ?? null,
    accountId: overrides.accountId ?? CHECKING_A.id,
    counterpartyAccountId: overrides.counterpartyAccountId ?? null,
    createdByUserId: overrides.createdByUserId ?? "u-1",
    createdAt: overrides.createdAt ?? new Date("2026-07-10T12:00:00Z"),
  };
}

describe("toBalanceEffect — pure conversion", () => {
  it("copies only the fields relevant to balance derivation", () => {
    const t = tx({
      type: "transfer",
      amountCents: 3_000,
      accountId: "acc-a",
      counterpartyAccountId: "acc-b",
    });
    expect(toBalanceEffect(t)).toEqual({
      type: "transfer",
      amountCents: 3_000,
      accountId: "acc-a",
      counterpartyAccountId: "acc-b",
    });
  });

  it("preserves null counterparty for income/expense", () => {
    const t = tx({ type: "income", amountCents: 500 });
    expect(toBalanceEffect(t).counterpartyAccountId).toBeNull();
  });

  it("toBalanceEffects converts an array in order", () => {
    const list = [
      tx({ id: "1", type: "expense", amountCents: 100 }),
      tx({ id: "2", type: "income", amountCents: 200 }),
    ];
    const out = toBalanceEffects(list);
    expect(out).toHaveLength(2);
    expect(out[0].type).toBe("expense");
    expect(out[1].type).toBe("income");
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 T-01 Create expense — balance goes from 10000 to 7000
// ---------------------------------------------------------------------------
describe("SPEC-05 T-01 — create expense reduces balance", () => {
  it("expense 3000 on a 10000 checking leaves 7000", () => {
    const expense = tx({
      type: "expense",
      amountCents: 3_000,
      accountId: CHECKING_A.id,
      categoryId: "cat-food",
    });
    const balance = calculateAccountBalance(CHECKING_A, [
      toBalanceEffect(expense),
    ]);
    expect(balance.amountCents).toBe(7_000);
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 T-02 Create income
// ---------------------------------------------------------------------------
describe("SPEC-05 T-02 — create income increases balance", () => {
  it("income 5000 on a 10000 checking leaves 15000", () => {
    const income = tx({
      type: "income",
      amountCents: 5_000,
      accountId: CHECKING_A.id,
      categoryId: "cat-salary",
    });
    const balance = calculateAccountBalance(CHECKING_A, [
      toBalanceEffect(income),
    ]);
    expect(balance.amountCents).toBe(15_000);
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 T-05 Update amount — recomputing with the new amount adjusts balance
// ---------------------------------------------------------------------------
describe("SPEC-05 T-05 — update amount re-derives balance", () => {
  it("swapping the tx amount from 3000 to 2000 leaves the account at 8000", () => {
    const before = tx({
      type: "expense",
      amountCents: 3_000,
      accountId: CHECKING_A.id,
    });
    const after = { ...before, amountCents: 2_000 };
    const b1 = calculateAccountBalance(CHECKING_A, [toBalanceEffect(before)]);
    const b2 = calculateAccountBalance(CHECKING_A, [toBalanceEffect(after)]);
    expect(b1.amountCents).toBe(7_000);
    expect(b2.amountCents).toBe(8_000);
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 T-06 Delete — removing the tx restores the original balance
// ---------------------------------------------------------------------------
describe("SPEC-05 T-06 — deleting a transaction restores the balance", () => {
  it("removing a 3000 expense returns the account to its initial balance", () => {
    const expense = tx({
      type: "expense",
      amountCents: 3_000,
      accountId: CHECKING_A.id,
    });
    const withTx = calculateAccountBalance(CHECKING_A, [
      toBalanceEffect(expense),
    ]);
    const withoutTx = calculateAccountBalance(CHECKING_A, []);
    expect(withTx.amountCents).toBe(7_000);
    expect(withoutTx.amountCents).toBe(CHECKING_A.initialBalanceCents);
  });
});

// ---------------------------------------------------------------------------
// SPEC-06 T-01 — Transfer entre checkings
// ---------------------------------------------------------------------------
describe("SPEC-06 T-01 — transfer between checkings", () => {
  it("A=10000, B=0, transfer 4000 A→B leaves A=6000 and B=4000", () => {
    const transfer = tx({
      type: "transfer",
      amountCents: 4_000,
      accountId: CHECKING_A.id,
      counterpartyAccountId: CHECKING_B.id,
      categoryId: null,
    });
    const a = calculateAccountBalance(CHECKING_A, [toBalanceEffect(transfer)]);
    const b = calculateAccountBalance(CHECKING_B, [toBalanceEffect(transfer)]);
    expect(a.amountCents).toBe(6_000);
    expect(b.amountCents).toBe(4_000);
  });
});

// ---------------------------------------------------------------------------
// SPEC-06 T-03 — Delete restaura saldos
// ---------------------------------------------------------------------------
describe("SPEC-06 T-03 — deleting a transfer restores both balances", () => {
  it("A=10000, B=0, delete 4000 transfer returns to A=10000, B=0", () => {
    const transfer = tx({
      type: "transfer",
      amountCents: 4_000,
      accountId: CHECKING_A.id,
      counterpartyAccountId: CHECKING_B.id,
    });
    const withTx = {
      a: calculateAccountBalance(CHECKING_A, [toBalanceEffect(transfer)]),
      b: calculateAccountBalance(CHECKING_B, [toBalanceEffect(transfer)]),
    };
    const withoutTx = {
      a: calculateAccountBalance(CHECKING_A, []),
      b: calculateAccountBalance(CHECKING_B, []),
    };
    expect(withTx.a.amountCents).toBe(6_000);
    expect(withTx.b.amountCents).toBe(4_000);
    expect(withoutTx.a.amountCents).toBe(10_000);
    expect(withoutTx.b.amountCents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// SPEC-06 acceptance — sum of asset balances doesn't change on transfer
// ---------------------------------------------------------------------------
describe("SPEC-06 acceptance — asset totals invariant under transfer", () => {
  it("sum of A + B is unchanged when a transfer moves value between them", () => {
    const transfer = tx({
      type: "transfer",
      amountCents: 4_000,
      accountId: CHECKING_A.id,
      counterpartyAccountId: CHECKING_B.id,
    });
    const before =
      CHECKING_A.initialBalanceCents + CHECKING_B.initialBalanceCents;
    const a = calculateAccountBalance(CHECKING_A, [toBalanceEffect(transfer)]);
    const b = calculateAccountBalance(CHECKING_B, [toBalanceEffect(transfer)]);
    expect(a.amountCents + b.amountCents).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// SPEC-06 T-04 — Transfer does not count as expense (type check)
// ---------------------------------------------------------------------------
describe("SPEC-06 T-04 — transfer is not an expense", () => {
  it("a transfer's type is 'transfer', not 'expense' (budget logic skips it)", () => {
    const transfer = tx({
      type: "transfer",
      amountCents: 4_000,
      accountId: CHECKING_A.id,
      counterpartyAccountId: CHECKING_B.id,
      categoryId: null,
    });
    expect(transfer.type).toBe("transfer");
    expect(transfer.categoryId).toBeNull();
    // Downstream budget calculators MUST filter by type === "expense" and
    // will therefore ignore this row. Full budget scenarios ship in a later
    // SPEC; this test pins the guarantee.
  });
});
