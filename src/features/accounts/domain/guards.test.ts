import { describe, expect, it } from "vitest";
import { isWorkspaceReadyToUse } from "@/features/workspaces/domain";
import {
  AccountArchivedError,
  AccountDeleteConfirmationMismatchError,
  AccountHasCrossWorkspaceLinksError,
  AccountLinkedToActiveGoalError,
  CannotDeleteLastActiveAccountError,
  InvalidAccountNameError,
  InvalidCreditLimitError,
  UnsupportedAccountCurrencyError,
  assertAccountAcceptsTransactions,
  assertAccountCurrencyAllowed,
  assertCanArchiveAccount,
  assertCanDeleteAccount,
  assertCurrencyMatchesWorkspace,
  assertDeleteAccountConfirmation,
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

describe("assertValidCreditLimit — SPEC-03 T-06 / T-08 / T-24 (KRI-11)", () => {
  it("allows credit_card with omitted/null creditLimit (T-06)", () => {
    expect(() => assertValidCreditLimit("credit_card", undefined)).not.toThrow();
    expect(() => assertValidCreditLimit("credit_card", null)).not.toThrow();
  });

  it("allows null or undefined creditLimit on any type", () => {
    expect(() => assertValidCreditLimit("checking", null)).not.toThrow();
    expect(() => assertValidCreditLimit("checking", undefined)).not.toThrow();
  });

  it("allows positive creditLimit on credit_card", () => {
    expect(() => assertValidCreditLimit("credit_card", 100_000)).not.toThrow();
    expect(() =>
      assertValidCreditLimit("credit_card", 500_000),
    ).not.toThrow();
  });

  it("rejects creditLimit on non-credit_card (T-08 / T-24)", () => {
    expect(() => assertValidCreditLimit("checking", 100_000)).toThrow(
      InvalidCreditLimitError,
    );
    expect(() => assertValidCreditLimit("savings", 1_000)).toThrow(
      InvalidCreditLimitError,
    );
  });

  it("rejects non-positive or non-integer creditLimit on credit_card", () => {
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

describe("assertCanArchiveAccount — SPEC-03 T-10 / T-20", () => {
  it("passes when no active goals are linked", () => {
    expect(() =>
      assertCanArchiveAccount({
        accountId: "acc-a",
        activeGoalsLinkedToAccount: [],
      }),
    ).not.toThrow();
  });

  it("throws AccountLinkedToActiveGoal when an active goal is linked (T-10)", () => {
    expect(() =>
      assertCanArchiveAccount({
        accountId: "acc-a",
        activeGoalsLinkedToAccount: [{ id: "goal-1" }],
      }),
    ).toThrow(AccountLinkedToActiveGoalError);
  });

  it("does not block archiving the last active account (T-09 domain)", () => {
    expect(() =>
      assertCanArchiveAccount({
        accountId: "acc-only",
        activeGoalsLinkedToAccount: [],
      }),
    ).not.toThrow();
    expect(isWorkspaceReadyToUse({ accountCount: 0 })).toBe(false);
  });
});

describe("assertCanDeleteAccount — SPEC-03 T-13 / T-14 / T-18 / T-20", () => {
  const base = {
    accountId: "acc-a",
    isArchived: false,
    activeAccountCountInWorkspace: 2,
    activeGoalsLinkedToAccount: [] as { id: string }[],
    hasCrossWorkspaceLinks: false,
  };

  it("passes when all guards clear", () => {
    expect(() => assertCanDeleteAccount(base)).not.toThrow();
  });

  it("throws CannotDeleteLastActiveAccount for the only active account (T-13)", () => {
    expect(() =>
      assertCanDeleteAccount({
        ...base,
        activeAccountCountInWorkspace: 1,
      }),
    ).toThrow(CannotDeleteLastActiveAccountError);
  });

  it("allows delete of an archived account even if workspace has 0 active", () => {
    expect(() =>
      assertCanDeleteAccount({
        ...base,
        isArchived: true,
        activeAccountCountInWorkspace: 0,
      }),
    ).not.toThrow();
  });

  it("throws AccountLinkedToActiveGoal when an active goal is linked (T-14)", () => {
    expect(() =>
      assertCanDeleteAccount({
        ...base,
        activeGoalsLinkedToAccount: [{ id: "goal-1" }],
      }),
    ).toThrow(AccountLinkedToActiveGoalError);
  });

  it("throws AccountHasCrossWorkspaceLinks when cross-ws flag is set (T-18)", () => {
    expect(() =>
      assertCanDeleteAccount({
        ...base,
        hasCrossWorkspaceLinks: true,
      }),
    ).toThrow(AccountHasCrossWorkspaceLinksError);
  });

  it("checks active goal before last-active (goal wins)", () => {
    expect(() =>
      assertCanDeleteAccount({
        ...base,
        activeAccountCountInWorkspace: 1,
        activeGoalsLinkedToAccount: [{ id: "goal-1" }],
      }),
    ).toThrow(AccountLinkedToActiveGoalError);
  });
});

describe("assertDeleteAccountConfirmation — SPEC-03 §6", () => {
  it("passes when confirmName matches account name", () => {
    expect(() =>
      assertDeleteAccountConfirmation({
        accountName: "Banco Nación",
        confirmName: "Banco Nación",
      }),
    ).not.toThrow();
  });

  it("trims both sides before comparing", () => {
    expect(() =>
      assertDeleteAccountConfirmation({
        accountName: "  Caja  ",
        confirmName: "Caja",
      }),
    ).not.toThrow();
  });

  it("throws AccountDeleteConfirmationMismatch on mismatch", () => {
    expect(() =>
      assertDeleteAccountConfirmation({
        accountName: "Banco",
        confirmName: "banco",
      }),
    ).toThrow(AccountDeleteConfirmationMismatchError);
  });
});
