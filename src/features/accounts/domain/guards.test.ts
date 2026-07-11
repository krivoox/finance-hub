import { describe, expect, it } from "vitest";
import {
  AccountArchivedError,
  AccountCurrencyMismatchError,
  InvalidAccountNameError,
  assertAccountAcceptsTransactions,
  assertCurrencyMatchesWorkspace,
  assertValidAccountName,
} from "./guards";

describe("assertCurrencyMatchesWorkspace — SPEC-03 T-02", () => {
  it("passes when account currency equals workspace baseCurrency", () => {
    expect(() =>
      assertCurrencyMatchesWorkspace("ARS", "ARS"),
    ).not.toThrow();
  });

  it("throws AccountCurrencyMismatchError otherwise (MVP: no FX)", () => {
    expect(() => assertCurrencyMatchesWorkspace("USD", "ARS")).toThrow(
      AccountCurrencyMismatchError,
    );
  });

  it("is case-sensitive: currencies must be exact ISO codes", () => {
    expect(() => assertCurrencyMatchesWorkspace("ars", "ARS")).toThrow(
      AccountCurrencyMismatchError,
    );
  });
});

describe("assertAccountAcceptsTransactions — SPEC-03 T-04", () => {
  it("passes when the account is not archived", () => {
    expect(() =>
      assertAccountAcceptsTransactions({ isArchived: false }),
    ).not.toThrow();
  });

  it("throws AccountArchivedError when the account is archived", () => {
    expect(() =>
      assertAccountAcceptsTransactions({ isArchived: true }),
    ).toThrow(AccountArchivedError);
  });
});

describe("assertValidAccountName — SPEC-03 §5 (max 80, not empty)", () => {
  it("accepts a normal name", () => {
    expect(() => assertValidAccountName("Caja de ahorro")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertValidAccountName("")).toThrow(InvalidAccountNameError);
  });

  it("rejects whitespace-only names", () => {
    expect(() => assertValidAccountName("   ")).toThrow(InvalidAccountNameError);
  });

  it("rejects names longer than 80 characters", () => {
    const tooLong = "a".repeat(81);
    expect(() => assertValidAccountName(tooLong)).toThrow(
      InvalidAccountNameError,
    );
  });

  it("accepts names exactly at the 80-character limit", () => {
    const boundary = "a".repeat(80);
    expect(() => assertValidAccountName(boundary)).not.toThrow();
  });
});
