import { describe, expect, it } from "vitest";
import {
  AccountArchivedError,
  AccountWorkspaceMismatchError,
  CategoryKindMismatchError,
  CategoryNotAllowedError,
  CategoryRequiredError,
  CounterpartyNotAllowedError,
  CounterpartyRequiredError,
  InvalidAmountError,
  InvalidDescriptionError,
  InvalidOccurredOnError,
  OccurredOnTooFutureError,
  SameAccountTransferError,
  TransactionCurrencyMismatchError,
  assertAccountActive,
  assertAccountBelongsToWorkspace,
  assertCategoryKindMatches,
  assertCategoryRequiredForType,
  assertOccurredOnNotTooFuture,
  assertTransactionCurrencyMatchesAccount,
  assertTransferAccounts,
  assertTransferCounterparty,
  assertValidAmount,
  normalizeDescription,
} from "./index";

// ---------------------------------------------------------------------------
// SPEC-05 T-03 — Amount cero o negativo
// ---------------------------------------------------------------------------
describe("assertValidAmount — SPEC-05 T-03", () => {
  it("accepts positive integers", () => {
    expect(() => assertValidAmount(1)).not.toThrow();
    expect(() => assertValidAmount(1_000_000)).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => assertValidAmount(0)).toThrow(InvalidAmountError);
  });

  it("rejects negative amounts", () => {
    expect(() => assertValidAmount(-1)).toThrow(InvalidAmountError);
    expect(() => assertValidAmount(-1000)).toThrow(InvalidAmountError);
  });

  it("rejects non-integer amounts (cents must be integer, ADR-001)", () => {
    expect(() => assertValidAmount(1.5)).toThrow(InvalidAmountError);
    expect(() => assertValidAmount(0.1)).toThrow(InvalidAmountError);
  });

  it("rejects NaN and Infinity", () => {
    expect(() => assertValidAmount(Number.NaN)).toThrow(InvalidAmountError);
    expect(() => assertValidAmount(Number.POSITIVE_INFINITY)).toThrow(
      InvalidAmountError,
    );
    expect(() => assertValidAmount(Number.NEGATIVE_INFINITY)).toThrow(
      InvalidAmountError,
    );
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 §4 / SPEC-06 §4 — Category required for income/expense, forbidden on
// transfers.
// ---------------------------------------------------------------------------
describe("assertCategoryRequiredForType", () => {
  it("income requires a category", () => {
    expect(() => assertCategoryRequiredForType("income", null)).toThrow(
      CategoryRequiredError,
    );
    expect(() => assertCategoryRequiredForType("income", "")).toThrow(
      CategoryRequiredError,
    );
    expect(() => assertCategoryRequiredForType("income", undefined)).toThrow(
      CategoryRequiredError,
    );
  });

  it("expense requires a category", () => {
    expect(() => assertCategoryRequiredForType("expense", null)).toThrow(
      CategoryRequiredError,
    );
  });

  it("income/expense pass when categoryId is present", () => {
    expect(() => assertCategoryRequiredForType("income", "cat-1")).not.toThrow();
    expect(() =>
      assertCategoryRequiredForType("expense", "cat-1"),
    ).not.toThrow();
  });

  it("transfer must NOT carry a category", () => {
    expect(() => assertCategoryRequiredForType("transfer", "cat-1")).toThrow(
      CategoryNotAllowedError,
    );
  });

  it("transfer without category is fine", () => {
    expect(() => assertCategoryRequiredForType("transfer", null)).not.toThrow();
    expect(() => assertCategoryRequiredForType("transfer", "")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 T-04 — CategoryKindMismatch
// ---------------------------------------------------------------------------
describe("assertCategoryKindMatches — SPEC-05 T-04", () => {
  it("income + income kind is fine", () => {
    expect(() => assertCategoryKindMatches("income", "income")).not.toThrow();
  });

  it("expense + expense kind is fine", () => {
    expect(() => assertCategoryKindMatches("expense", "expense")).not.toThrow();
  });

  it("expense + income kind throws", () => {
    expect(() => assertCategoryKindMatches("expense", "income")).toThrow(
      CategoryKindMismatchError,
    );
  });

  it("income + expense kind throws", () => {
    expect(() => assertCategoryKindMatches("income", "expense")).toThrow(
      CategoryKindMismatchError,
    );
  });

  it("transfer never has a category — asserting one is a programmer error", () => {
    expect(() => assertCategoryKindMatches("transfer", "income")).toThrow(
      CategoryNotAllowedError,
    );
    expect(() => assertCategoryKindMatches("transfer", "expense")).toThrow(
      CategoryNotAllowedError,
    );
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 T-07 — Archived account
// ---------------------------------------------------------------------------
describe("assertAccountActive — SPEC-05 T-07", () => {
  it("passes when the account is active", () => {
    expect(() => assertAccountActive(false)).not.toThrow();
  });

  it("throws AccountArchivedError when the account is archived", () => {
    expect(() => assertAccountActive(true)).toThrow(AccountArchivedError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-06 T-02 — Transfer with same origin/destination
// ---------------------------------------------------------------------------
describe("assertTransferAccounts — SPEC-06 T-02", () => {
  it("passes when origin and destination differ", () => {
    expect(() => assertTransferAccounts("a", "b")).not.toThrow();
  });

  it("throws SameAccountTransferError when both ids match", () => {
    expect(() => assertTransferAccounts("a", "a")).toThrow(
      SameAccountTransferError,
    );
  });
});

// ---------------------------------------------------------------------------
// SPEC-06 FR-01 — Transfer needs counterparty; other types must not have one
// ---------------------------------------------------------------------------
describe("assertTransferCounterparty", () => {
  it("transfer requires counterpartyAccountId", () => {
    expect(() => assertTransferCounterparty("transfer", null)).toThrow(
      CounterpartyRequiredError,
    );
    expect(() => assertTransferCounterparty("transfer", "")).toThrow(
      CounterpartyRequiredError,
    );
    expect(() => assertTransferCounterparty("transfer", undefined)).toThrow(
      CounterpartyRequiredError,
    );
  });

  it("transfer with counterparty passes", () => {
    expect(() => assertTransferCounterparty("transfer", "acc-2")).not.toThrow();
  });

  it("income/expense must NOT have counterparty", () => {
    expect(() => assertTransferCounterparty("income", "acc-2")).toThrow(
      CounterpartyNotAllowedError,
    );
    expect(() => assertTransferCounterparty("expense", "acc-2")).toThrow(
      CounterpartyNotAllowedError,
    );
  });

  it("income/expense without counterparty is fine", () => {
    expect(() => assertTransferCounterparty("income", null)).not.toThrow();
    expect(() => assertTransferCounterparty("expense", null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 FR-05 — Currency must match account
// ---------------------------------------------------------------------------
describe("assertTransactionCurrencyMatchesAccount", () => {
  it("passes when currencies are equal", () => {
    expect(() =>
      assertTransactionCurrencyMatchesAccount("ARS", "ARS"),
    ).not.toThrow();
  });

  it("throws when currencies differ (MVP: no FX)", () => {
    expect(() => assertTransactionCurrencyMatchesAccount("USD", "ARS")).toThrow(
      TransactionCurrencyMismatchError,
    );
  });

  it("is case-sensitive", () => {
    expect(() => assertTransactionCurrencyMatchesAccount("ars", "ARS")).toThrow(
      TransactionCurrencyMismatchError,
    );
  });
});

// ---------------------------------------------------------------------------
// Multi-tenancy — account must belong to the transaction's workspace
// ---------------------------------------------------------------------------
describe("assertAccountBelongsToWorkspace (ADR-002)", () => {
  it("passes when both workspaces match", () => {
    expect(() =>
      assertAccountBelongsToWorkspace("ws-1", "ws-1"),
    ).not.toThrow();
  });

  it("throws when they differ", () => {
    expect(() =>
      assertAccountBelongsToWorkspace("ws-2", "ws-1"),
    ).toThrow(AccountWorkspaceMismatchError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-05 §4 — occurredOn ≤ today + 1 day (tolerancia clock skew)
// ---------------------------------------------------------------------------
describe("assertOccurredOnNotTooFuture — SPEC-05 §4", () => {
  const NOW = new Date("2026-07-10T12:00:00Z");

  it("allows today", () => {
    expect(() =>
      assertOccurredOnNotTooFuture(new Date("2026-07-10T00:00:00Z"), NOW),
    ).not.toThrow();
  });

  it("allows tomorrow (clock-skew tolerance)", () => {
    expect(() =>
      assertOccurredOnNotTooFuture(new Date("2026-07-11T00:00:00Z"), NOW),
    ).not.toThrow();
  });

  it("allows any past date", () => {
    expect(() =>
      assertOccurredOnNotTooFuture(new Date("2020-01-01T00:00:00Z"), NOW),
    ).not.toThrow();
  });

  it("rejects the day after tomorrow", () => {
    expect(() =>
      assertOccurredOnNotTooFuture(new Date("2026-07-12T00:00:00Z"), NOW),
    ).toThrow(OccurredOnTooFutureError);
  });

  it("respects the caller's timezone (America/Argentina/Buenos_Aires)", () => {
    // Buenos Aires is UTC-3. At 2026-07-10T02:00Z it's still 2026-07-09 there,
    // so BA "today" is 2026-07-09 and the max allowed BA date is 2026-07-10.
    const now = new Date("2026-07-10T02:00:00Z"); // 2026-07-09 23:00 BA
    // 2026-07-10 17:00 BA — BA date = 2026-07-10, exactly the "tomorrow" limit.
    expect(() =>
      assertOccurredOnNotTooFuture(
        new Date("2026-07-10T20:00:00Z"),
        now,
        "America/Argentina/Buenos_Aires",
      ),
    ).not.toThrow();
    // 2026-07-11 17:00 BA — BA date = 2026-07-11 = today+2 → rejected.
    expect(() =>
      assertOccurredOnNotTooFuture(
        new Date("2026-07-11T20:00:00Z"),
        now,
        "America/Argentina/Buenos_Aires",
      ),
    ).toThrow(OccurredOnTooFutureError);
  });

  it("uses the timezone to relax UTC-strict checks near midnight", () => {
    // now = 2026-07-10 23:30 UTC ⇒ UTC today = 2026-07-10, max UTC = 2026-07-11
    // In BA (UTC-3) it's already 2026-07-10 20:30 → same day. But an UTC
    // "day-after-tomorrow" instant early enough is still "tomorrow" in BA:
    //   2026-07-12T00:00Z = 2026-07-11 21:00 BA → BA date = 2026-07-11
    // → allowed when timezone is BA, rejected when it is not.
    const now = new Date("2026-07-10T23:30:00Z");
    const occurredOn = new Date("2026-07-12T00:00:00Z");
    expect(() => assertOccurredOnNotTooFuture(occurredOn, now)).toThrow(
      OccurredOnTooFutureError,
    );
    expect(() =>
      assertOccurredOnNotTooFuture(
        occurredOn,
        now,
        "America/Argentina/Buenos_Aires",
      ),
    ).not.toThrow();
  });

  it("rejects invalid Date instances", () => {
    expect(() =>
      assertOccurredOnNotTooFuture(new Date("not-a-date"), NOW),
    ).toThrow(InvalidOccurredOnError);
  });
});

// ---------------------------------------------------------------------------
// Description normalization
// ---------------------------------------------------------------------------
describe("normalizeDescription", () => {
  it("returns null for null / undefined", () => {
    expect(normalizeDescription(null)).toBeNull();
    expect(normalizeDescription(undefined)).toBeNull();
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeDescription("  Sueldo   Julio  ")).toBe("Sueldo Julio");
  });

  it("returns null when the trimmed string is empty", () => {
    expect(normalizeDescription("   ")).toBeNull();
  });

  it("throws InvalidDescriptionError for non-string non-null values", () => {
    expect(() => normalizeDescription(42 as unknown)).toThrow(
      InvalidDescriptionError,
    );
  });

  it("rejects strings past the limit", () => {
    const tooLong = "x".repeat(500);
    expect(() => normalizeDescription(tooLong)).toThrow(
      InvalidDescriptionError,
    );
  });
});
