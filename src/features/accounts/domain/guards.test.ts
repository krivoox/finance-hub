import { describe, expect, it } from "vitest";
import {
  AccountArchivedError,
  InvalidAccountNameError,
  UnsupportedAccountCurrencyError,
  assertAccountAcceptsTransactions,
  assertAccountCurrencyAllowed,
  assertCurrencyMatchesWorkspace,
  assertValidAccountName,
} from "./guards";

describe("assertAccountCurrencyAllowed — SPEC-03 T-02 / T-02b", () => {
  it("passes for ARS", () => {
    expect(() => assertAccountCurrencyAllowed("ARS")).not.toThrow();
  });

  it("passes for USD even when workspace base is ARS (T-02b)", () => {
    expect(() => assertAccountCurrencyAllowed("USD")).not.toThrow();
    expect(() => assertCurrencyMatchesWorkspace("USD", "ARS")).not.toThrow();
  });

  it("throws UnsupportedAccountCurrencyError for EUR", () => {
    expect(() => assertAccountCurrencyAllowed("EUR")).toThrow(
      UnsupportedAccountCurrencyError,
    );
  });

  it("rejects lowercase codes", () => {
    expect(() => assertAccountCurrencyAllowed("ars")).toThrow(
      UnsupportedAccountCurrencyError,
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
