import { describe, expect, it } from "vitest";
import {
  AccountArchivedError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  UnsupportedAccountCurrencyError,
  assertAccountAcceptsTransactions,
  assertAccountCurrencyAllowed,
  assertCurrencyMatchesWorkspace,
  assertValidAccountName,
  assertValidCreditLimit,
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

describe("assertValidCreditLimit — SPEC-03 T-09 (KRI-11)", () => {
  it("rejects creditLimit on non-credit_card types", () => {
    expect(() => assertValidCreditLimit("checking", 1_000)).toThrow(
      InvalidCreditLimitError,
    );
    expect(() => assertValidCreditLimit("savings", 1_000)).toThrow(
      InvalidCreditLimitError,
    );
  });

  it("allows null or undefined creditLimit on any type", () => {
    expect(() => assertValidCreditLimit("checking", null)).not.toThrow();
    expect(() => assertValidCreditLimit("checking", undefined)).not.toThrow();
    expect(() => assertValidCreditLimit("credit_card", null)).not.toThrow();
    expect(() =>
      assertValidCreditLimit("credit_card", undefined),
    ).not.toThrow();
  });

  it("accepts a positive integer limit on credit_card", () => {
    expect(() =>
      assertValidCreditLimit("credit_card", 500_000),
    ).not.toThrow();
  });

  it("rejects zero, negative, or non-integer limits on credit_card", () => {
    expect(() => assertValidCreditLimit("credit_card", 0)).toThrow(
      InvalidCreditLimitError,
    );
    expect(() => assertValidCreditLimit("credit_card", -1)).toThrow(
      InvalidCreditLimitError,
    );
    expect(() => assertValidCreditLimit("credit_card", 1.5)).toThrow(
      InvalidCreditLimitError,
    );
  });
});
