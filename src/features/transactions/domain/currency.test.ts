import { describe, expect, it } from "vitest";
import {
  currenciesPresentInAccounts,
  filterAccountsByCurrency,
  filterPaymentGroupsByCurrency,
  resolveTransactionFormCurrency,
} from "./currency";

describe("resolveTransactionFormCurrency — SPEC-05 T-22", () => {
  it("defaults to workspace baseCurrency when selected is missing", () => {
    expect(
      resolveTransactionFormCurrency({
        selected: undefined,
        workspaceBaseCurrency: "ARS",
      }),
    ).toBe("ARS");
  });

  it("defaults to USD when workspace base is USD", () => {
    expect(
      resolveTransactionFormCurrency({
        selected: null,
        workspaceBaseCurrency: "USD",
      }),
    ).toBe("USD");
  });

  it("keeps an explicit valid selection", () => {
    expect(
      resolveTransactionFormCurrency({
        selected: "USD",
        workspaceBaseCurrency: "ARS",
      }),
    ).toBe("USD");
  });

  it("falls back to base when selection is unsupported", () => {
    expect(
      resolveTransactionFormCurrency({
        selected: "EUR",
        workspaceBaseCurrency: "ARS",
      }),
    ).toBe("ARS");
  });

  it("falls back to ARS when base is also unsupported", () => {
    expect(
      resolveTransactionFormCurrency({
        selected: "EUR",
        workspaceBaseCurrency: "XYZ",
      }),
    ).toBe("ARS");
  });
});

describe("filterAccountsByCurrency — SPEC-05 T-23", () => {
  const accounts = [
    { id: "a1", currency: "ARS", name: "MP" },
    { id: "a2", currency: "USD", name: "Broker" },
    { id: "a3", currency: "ARS", name: "Efectivo" },
  ];

  it("returns only accounts matching USD", () => {
    expect(filterAccountsByCurrency(accounts, "USD")).toEqual([
      { id: "a2", currency: "USD", name: "Broker" },
    ]);
  });

  it("returns only accounts matching ARS", () => {
    expect(filterAccountsByCurrency(accounts, "ARS")).toEqual([
      { id: "a1", currency: "ARS", name: "MP" },
      { id: "a3", currency: "ARS", name: "Efectivo" },
    ]);
  });

  it("returns empty when no account matches", () => {
    expect(
      filterAccountsByCurrency([{ id: "x", currency: "ARS" }], "USD"),
    ).toEqual([]);
  });
});

describe("filterPaymentGroupsByCurrency", () => {
  it("filters accounts inside groups and drops empty groups", () => {
    const groups = [
      {
        workspaceId: "ws-1",
        accounts: [
          { id: "a1", currency: "ARS" },
          { id: "a2", currency: "USD" },
        ],
      },
      {
        workspaceId: "ws-2",
        accounts: [{ id: "a3", currency: "ARS" }],
      },
    ];

    expect(filterPaymentGroupsByCurrency(groups, "USD")).toEqual([
      {
        workspaceId: "ws-1",
        accounts: [{ id: "a2", currency: "USD" }],
      },
    ]);
  });
});

describe("currenciesPresentInAccounts", () => {
  it("returns stable ARS then USD when both exist", () => {
    expect(
      currenciesPresentInAccounts([
        { id: "u", currency: "USD" },
        { id: "a", currency: "ARS" },
      ]),
    ).toEqual(["ARS", "USD"]);
  });

  it("ignores unsupported codes", () => {
    expect(
      currenciesPresentInAccounts([{ id: "e", currency: "EUR" }]),
    ).toEqual([]);
  });
});
