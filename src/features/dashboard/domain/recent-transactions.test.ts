import { describe, expect, it } from "vitest";
import { selectRecentTransactions } from "./recent-transactions";
import type { DashboardTransaction } from "./types";

type Tagged = DashboardTransaction & { id: string };

function tx(overrides: Partial<Tagged>): Tagged {
  return {
    id: overrides.id ?? "tx-" + Math.random().toString(36).slice(2, 8),
    type: overrides.type ?? "expense",
    amountCents: overrides.amountCents ?? 1_000,
    currency: overrides.currency ?? "ARS",
    occurredOn: overrides.occurredOn ?? new Date("2026-07-10T00:00:00.000Z"),
    createdAt: overrides.createdAt ?? new Date("2026-07-10T12:00:00.000Z"),
  };
}

describe("selectRecentTransactions — SPEC-12 §4 (recent N)", () => {
  it("returns [] when input is empty", () => {
    expect(selectRecentTransactions<Tagged>([], 10)).toEqual([]);
  });

  it("sorts by occurredOn desc then createdAt desc and takes the first N", () => {
    const list: Tagged[] = [
      tx({ id: "old", occurredOn: new Date("2026-07-01") }),
      tx({ id: "new", occurredOn: new Date("2026-07-15") }),
      tx({
        id: "same-day-late",
        occurredOn: new Date("2026-07-10"),
        createdAt: new Date("2026-07-10T20:00:00.000Z"),
      }),
      tx({
        id: "same-day-early",
        occurredOn: new Date("2026-07-10"),
        createdAt: new Date("2026-07-10T08:00:00.000Z"),
      }),
    ];
    const recent = selectRecentTransactions(list, 3);
    expect(recent.map((t) => t.id)).toEqual([
      "new",
      "same-day-late",
      "same-day-early",
    ]);
  });

  it("returns the whole list when limit is greater than the length", () => {
    const list: Tagged[] = [
      tx({ id: "a", occurredOn: new Date("2026-07-01") }),
      tx({ id: "b", occurredOn: new Date("2026-07-02") }),
    ];
    expect(selectRecentTransactions(list, 10).map((t) => t.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("returns an empty list for a non-positive limit", () => {
    const list: Tagged[] = [tx({ id: "a" }), tx({ id: "b" })];
    expect(selectRecentTransactions(list, 0)).toEqual([]);
    expect(selectRecentTransactions(list, -1)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const list: Tagged[] = [
      tx({ id: "a", occurredOn: new Date("2026-07-01") }),
      tx({ id: "b", occurredOn: new Date("2026-07-10") }),
    ];
    const snapshot = list.map((t) => t.id);
    selectRecentTransactions(list, 2);
    expect(list.map((t) => t.id)).toEqual(snapshot);
  });
});
