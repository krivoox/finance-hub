import { describe, expect, it } from "vitest";

import { findPossibleDuplicates } from "./duplicates";
import type { DuplicateCandidateTx } from "./types";

const rule = {
  type: "expense" as const,
  accountId: "acc-1",
  counterpartyAccountId: null,
  categoryId: "cat-1",
  amountCents: 5000,
};

function tx(
  overrides: Partial<DuplicateCandidateTx> = {},
): DuplicateCandidateTx {
  return {
    id: overrides.id ?? "tx-1",
    type: overrides.type ?? "expense",
    accountId: overrides.accountId ?? "acc-1",
    counterpartyAccountId: overrides.counterpartyAccountId ?? null,
    categoryId: overrides.categoryId ?? "cat-1",
    amountCents: overrides.amountCents ?? 5000,
    occurredOn: overrides.occurredOn ?? "2026-08-05",
    recurringRuleId: overrides.recurringRuleId ?? null,
  };
}

describe("SPEC-18 duplicates", () => {
  it("T-31 — match por monto ±10% y ventana ±3 días", () => {
    const hits = findPossibleDuplicates(rule, "2026-08-05", [
      tx({ amountCents: 5400, occurredOn: "2026-08-03" }),
    ]);
    expect(hits).toHaveLength(1);
  });

  it("T-32 — otra categoría no matchea", () => {
    const hits = findPossibleDuplicates(rule, "2026-08-05", [
      tx({ categoryId: "cat-other" }),
    ]);
    expect(hits).toHaveLength(0);
  });

  it("T-33 — ignora txs ya ligadas a regla", () => {
    const hits = findPossibleDuplicates(rule, "2026-08-05", [
      tx({ recurringRuleId: "rule-other" }),
    ]);
    expect(hits).toHaveLength(0);
  });
});
