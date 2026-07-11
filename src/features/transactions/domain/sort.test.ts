import { describe, expect, it } from "vitest";
import { sortTransactionsForList } from "./sort";
import type { TransactionLike } from "./types";

function tx(overrides: Partial<TransactionLike>): TransactionLike {
  return {
    id: overrides.id ?? "tx-" + Math.random().toString(36).slice(2, 8),
    workspaceId: "ws-1",
    type: overrides.type ?? "expense",
    amountCents: 1_000,
    currency: "ARS",
    occurredOn: overrides.occurredOn ?? new Date("2026-07-10T00:00:00Z"),
    description: null,
    categoryId: null,
    accountId: "acc-a",
    counterpartyAccountId: null,
    createdByUserId: "u-1",
    createdAt: overrides.createdAt ?? new Date("2026-07-10T12:00:00Z"),
  };
}

describe("sortTransactionsForList — SPEC-05 §6", () => {
  it("sorts by occurredOn desc", () => {
    const list = [
      tx({ id: "old", occurredOn: new Date("2026-07-01") }),
      tx({ id: "new", occurredOn: new Date("2026-07-10") }),
      tx({ id: "mid", occurredOn: new Date("2026-07-05") }),
    ];
    const out = sortTransactionsForList(list);
    expect(out.map((t) => t.id)).toEqual(["new", "mid", "old"]);
  });

  it("breaks ties on same occurredOn using createdAt desc", () => {
    const day = new Date("2026-07-10");
    const list = [
      tx({
        id: "created-first",
        occurredOn: day,
        createdAt: new Date("2026-07-10T08:00:00Z"),
      }),
      tx({
        id: "created-last",
        occurredOn: day,
        createdAt: new Date("2026-07-10T20:00:00Z"),
      }),
    ];
    const out = sortTransactionsForList(list);
    expect(out.map((t) => t.id)).toEqual(["created-last", "created-first"]);
  });

  it("does not mutate the input array (SPEC-perf 7.14)", () => {
    const list = [
      tx({ id: "a", occurredOn: new Date("2026-07-01") }),
      tx({ id: "b", occurredOn: new Date("2026-07-10") }),
    ];
    const snapshot = list.map((t) => t.id);
    sortTransactionsForList(list);
    expect(list.map((t) => t.id)).toEqual(snapshot);
  });
});
