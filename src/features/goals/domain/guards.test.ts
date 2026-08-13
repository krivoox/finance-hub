import { describe, expect, it } from "vitest";
import {
  GoalCurrencyMismatchError,
  GoalDeleteConfirmationMismatchError,
  GoalLinkedAccountInvalidError,
  GoalLinkedAccountRequiredError,
  GoalNotActiveError,
  GoalNotEditableError,
  InvalidContributionAmountError,
  InvalidGoalNameError,
  InvalidTargetAmountError,
} from "./errors";
import {
  GOAL_NAME_MAX_LENGTH,
  applyContribution,
  applyGoalTargetChange,
  assertCanContribute,
  assertCanUpdateGoal,
  assertDeleteGoalConfirmation,
  assertGoalContributionTransferAccounts,
  assertGoalCurrencyAllowed,
  assertLinkedAccountForGoal,
  assertValidContribution,
  assertValidGoalName,
  assertValidTargetAmount,
  normalizeGoalName,
  progressPercent,
  reverseContribution,
} from "./guards";
import {
  AccountArchivedError,
  SameAccountTransferError,
  TransactionCurrencyMismatchError,
} from "@/features/transactions/domain";

// ---------------------------------------------------------------------------
// SPEC-08 T-05 — Invalid contribution amounts
// ---------------------------------------------------------------------------
describe("assertValidContribution — SPEC-08 T-05", () => {
  it("accepts strictly positive integer cents", () => {
    expect(() => assertValidContribution(1)).not.toThrow();
    expect(() => assertValidContribution(200_000_00)).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => assertValidContribution(0)).toThrow(
      InvalidContributionAmountError,
    );
  });

  it("rejects negative amounts", () => {
    expect(() => assertValidContribution(-1)).toThrow(
      InvalidContributionAmountError,
    );
    expect(() => assertValidContribution(-500)).toThrow(
      InvalidContributionAmountError,
    );
  });

  it("rejects non-integers", () => {
    expect(() => assertValidContribution(1.5)).toThrow(
      InvalidContributionAmountError,
    );
  });

  it("rejects NaN and non-finite values", () => {
    expect(() => assertValidContribution(Number.NaN)).toThrow(
      InvalidContributionAmountError,
    );
    expect(() => assertValidContribution(Number.POSITIVE_INFINITY)).toThrow(
      InvalidContributionAmountError,
    );
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-04 — cancelled/completed goals cannot receive contributions
// ---------------------------------------------------------------------------
describe("assertCanContribute — SPEC-08 T-04", () => {
  it("allows active goals", () => {
    expect(() => assertCanContribute("active")).not.toThrow();
  });

  it("rejects cancelled goals with GoalNotActiveError", () => {
    expect(() => assertCanContribute("cancelled")).toThrow(GoalNotActiveError);
  });

  it("rejects completed goals with GoalNotActiveError", () => {
    expect(() => assertCanContribute("completed")).toThrow(GoalNotActiveError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-02 / T-03 — applyContribution advances current and auto-completes
// ---------------------------------------------------------------------------
describe("applyContribution — SPEC-08 T-02 / T-03", () => {
  it("T-02 · adds the contribution to currentAmountCents", () => {
    const result = applyContribution(
      {
        currentAmountCents: 0,
        targetAmountCents: 500_000_00,
        status: "active",
      },
      200_000_00,
    );
    expect(result.newCurrentAmountCents).toBe(200_000_00);
    expect(result.newStatus).toBe("active");
  });

  it("T-03 · auto-completes when the new current reaches the target", () => {
    const result = applyContribution(
      {
        currentAmountCents: 400_000_00,
        targetAmountCents: 500_000_00,
        status: "active",
      },
      100_000_00,
    );
    expect(result.newCurrentAmountCents).toBe(500_000_00);
    expect(result.newStatus).toBe("completed");
  });

  it("auto-completes when the contribution exceeds the target (excess accepted, SPEC-08 §4)", () => {
    const result = applyContribution(
      {
        currentAmountCents: 400_000_00,
        targetAmountCents: 500_000_00,
        status: "active",
      },
      250_000_00,
    );
    expect(result.newCurrentAmountCents).toBe(650_000_00);
    expect(result.newStatus).toBe("completed");
  });

  it("rejects contributions to non-active goals", () => {
    expect(() =>
      applyContribution(
        {
          currentAmountCents: 0,
          targetAmountCents: 500_000_00,
          status: "cancelled",
        },
        1_000_00,
      ),
    ).toThrow(GoalNotActiveError);
  });

  it("rejects invalid amounts before touching the goal", () => {
    expect(() =>
      applyContribution(
        {
          currentAmountCents: 0,
          targetAmountCents: 500_000_00,
          status: "active",
        },
        0,
      ),
    ).toThrow(InvalidContributionAmountError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 FR-03 — progress percent for display (capped at 100)
// ---------------------------------------------------------------------------
describe("progressPercent — SPEC-08 FR-03", () => {
  it("T-01 · returns 0 when current is 0", () => {
    expect(progressPercent(0, 500_000_00)).toBe(0);
  });

  it("T-02 · returns 40 for 200k / 500k", () => {
    expect(progressPercent(200_000_00, 500_000_00)).toBe(40);
  });

  it("returns 100 when current equals target", () => {
    expect(progressPercent(500_000_00, 500_000_00)).toBe(100);
  });

  it("caps display value at 100 when current exceeds target", () => {
    expect(progressPercent(650_000_00, 500_000_00)).toBe(100);
  });

  it("returns 0 for invalid target (defensive)", () => {
    expect(progressPercent(1000, 0)).toBe(0);
    expect(progressPercent(1000, -1)).toBe(0);
  });

  it("floors fractional percentages to integer for display", () => {
    // 333/1000 = 33.3% → 33
    expect(progressPercent(333, 1000)).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// Create-time validators
// ---------------------------------------------------------------------------
describe("assertValidGoalName", () => {
  it("accepts a normal name", () => {
    expect(() => assertValidGoalName("Fondo de emergencia")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertValidGoalName("")).toThrow(InvalidGoalNameError);
  });

  it("rejects whitespace-only names", () => {
    expect(() => assertValidGoalName("   ")).toThrow(InvalidGoalNameError);
  });

  it("rejects names longer than the max length", () => {
    const tooLong = "a".repeat(GOAL_NAME_MAX_LENGTH + 1);
    expect(() => assertValidGoalName(tooLong)).toThrow(InvalidGoalNameError);
  });

  it("accepts names at the boundary", () => {
    const boundary = "a".repeat(GOAL_NAME_MAX_LENGTH);
    expect(() => assertValidGoalName(boundary)).not.toThrow();
  });
});

describe("normalizeGoalName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeGoalName("  Viaje   a   Bariloche  ")).toBe(
      "Viaje a Bariloche",
    );
  });
});

describe("assertValidTargetAmount — SPEC-08 §4 (targetAmount > 0)", () => {
  it("accepts positive integers", () => {
    expect(() => assertValidTargetAmount(1)).not.toThrow();
    expect(() => assertValidTargetAmount(1_000_000_00)).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => assertValidTargetAmount(0)).toThrow(InvalidTargetAmountError);
  });

  it("rejects negative amounts", () => {
    expect(() => assertValidTargetAmount(-1)).toThrow(InvalidTargetAmountError);
  });

  it("rejects non-integers", () => {
    expect(() => assertValidTargetAmount(1.5)).toThrow(
      InvalidTargetAmountError,
    );
  });
});

describe("assertGoalCurrencyAllowed — ADR-006", () => {
  it("accepts ARS and USD", () => {
    expect(() => assertGoalCurrencyAllowed("ARS")).not.toThrow();
    expect(() => assertGoalCurrencyAllowed("USD")).not.toThrow();
  });

  it("rejects other currencies", () => {
    expect(() => assertGoalCurrencyAllowed("EUR")).toThrow(
      GoalCurrencyMismatchError,
    );
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-06 / T-08 / T-09 / T-10 / T-16 — contribution transfer accounts
// ---------------------------------------------------------------------------
const WS = "ws_1";

function account(
  id: string,
  overrides: Partial<{
    workspaceId: string;
    currency: string;
    isArchived: boolean;
  }> = {},
) {
  return {
    id,
    workspaceId: overrides.workspaceId ?? WS,
    currency: overrides.currency ?? "ARS",
    isArchived: overrides.isArchived ?? false,
  };
}

describe("assertGoalContributionTransferAccounts — SPEC-08 H4", () => {
  it("T-16 · resolves from → linked when both accounts are valid", () => {
    const result = assertGoalContributionTransferAccounts({
      goalWorkspaceId: WS,
      goalCurrency: "ARS",
      linkedAccountId: "B",
      fromAccountId: "A",
      fromAccount: account("A"),
      linkedAccount: account("B"),
    });
    expect(result).toEqual({ fromAccountId: "A", toAccountId: "B" });
  });

  it("T-06 · requires linkedAccountId", () => {
    expect(() =>
      assertGoalContributionTransferAccounts({
        goalWorkspaceId: WS,
        goalCurrency: "ARS",
        linkedAccountId: null,
        fromAccountId: "A",
        fromAccount: account("A"),
        linkedAccount: null,
      }),
    ).toThrow(GoalLinkedAccountRequiredError);
  });

  it("T-08 · rejects when fromAccount equals linkedAccount", () => {
    expect(() =>
      assertGoalContributionTransferAccounts({
        goalWorkspaceId: WS,
        goalCurrency: "ARS",
        linkedAccountId: "B",
        fromAccountId: "B",
        fromAccount: account("B"),
        linkedAccount: account("B"),
      }),
    ).toThrow(SameAccountTransferError);
  });

  it("T-09 · rejects currency mismatch between from and linked", () => {
    expect(() =>
      assertGoalContributionTransferAccounts({
        goalWorkspaceId: WS,
        goalCurrency: "ARS",
        linkedAccountId: "B",
        fromAccountId: "C",
        fromAccount: account("C", { currency: "USD" }),
        linkedAccount: account("B", { currency: "ARS" }),
      }),
    ).toThrow(TransactionCurrencyMismatchError);
  });

  it("T-09 · rejects when goal currency differs from from-account", () => {
    expect(() =>
      assertGoalContributionTransferAccounts({
        goalWorkspaceId: WS,
        goalCurrency: "ARS",
        linkedAccountId: "B",
        fromAccountId: "C",
        fromAccount: account("C", { currency: "USD" }),
        linkedAccount: account("B", { currency: "USD" }),
      }),
    ).toThrow(TransactionCurrencyMismatchError);
  });

  it("T-10 · rejects archived from-account", () => {
    expect(() =>
      assertGoalContributionTransferAccounts({
        goalWorkspaceId: WS,
        goalCurrency: "ARS",
        linkedAccountId: "B",
        fromAccountId: "A",
        fromAccount: account("A", { isArchived: true }),
        linkedAccount: account("B"),
      }),
    ).toThrow(AccountArchivedError);
  });

  it("rejects archived linked account", () => {
    expect(() =>
      assertGoalContributionTransferAccounts({
        goalWorkspaceId: WS,
        goalCurrency: "ARS",
        linkedAccountId: "B",
        fromAccountId: "A",
        fromAccount: account("A"),
        linkedAccount: account("B", { isArchived: true }),
      }),
    ).toThrow(AccountArchivedError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-13 / T-14 — reverseContribution on transfer delete
// ---------------------------------------------------------------------------
describe("reverseContribution — SPEC-08 T-13 / T-14", () => {
  it("T-13 · subtracts the contribution amount from current", () => {
    const result = reverseContribution(
      {
        currentAmountCents: 20_000,
        targetAmountCents: 500_000,
        status: "active",
      },
      20_000,
    );
    expect(result.newCurrentAmountCents).toBe(0);
    expect(result.newStatus).toBe("active");
  });

  it("T-14 · reopens completed → active when current falls below target", () => {
    const result = reverseContribution(
      {
        currentAmountCents: 500_000,
        targetAmountCents: 500_000,
        status: "completed",
      },
      100_000,
    );
    expect(result.newCurrentAmountCents).toBe(400_000);
    expect(result.newStatus).toBe("active");
  });

  it("keeps completed when remaining current is still >= target", () => {
    const result = reverseContribution(
      {
        currentAmountCents: 600_000,
        targetAmountCents: 500_000,
        status: "completed",
      },
      50_000,
    );
    expect(result.newCurrentAmountCents).toBe(550_000);
    expect(result.newStatus).toBe("completed");
  });

  it("never reopens a cancelled goal", () => {
    const result = reverseContribution(
      {
        currentAmountCents: 100_000,
        targetAmountCents: 500_000,
        status: "cancelled",
      },
      50_000,
    );
    expect(result.newCurrentAmountCents).toBe(50_000);
    expect(result.newStatus).toBe("cancelled");
  });

  it("floors current at 0 (defensive)", () => {
    const result = reverseContribution(
      {
        currentAmountCents: 10_000,
        targetAmountCents: 500_000,
        status: "active",
      },
      20_000,
    );
    expect(result.newCurrentAmountCents).toBe(0);
  });

  it("rejects invalid amounts", () => {
    expect(() =>
      reverseContribution(
        {
          currentAmountCents: 10_000,
          targetAmountCents: 500_000,
          status: "active",
        },
        0,
      ),
    ).toThrow(InvalidContributionAmountError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-17 — Update target auto-complete / reopen
// ---------------------------------------------------------------------------
describe("applyGoalTargetChange — SPEC-08 T-17", () => {
  it("completes when the new target is at or below current", () => {
    const result = applyGoalTargetChange(
      { currentAmountCents: 200_000, status: "active" },
      150_000,
    );
    expect(result.newStatus).toBe("completed");
  });

  it("completes when the new target equals current", () => {
    const result = applyGoalTargetChange(
      { currentAmountCents: 200_000, status: "active" },
      200_000,
    );
    expect(result.newStatus).toBe("completed");
  });

  it("reopens a completed goal when the new target is above current", () => {
    const result = applyGoalTargetChange(
      { currentAmountCents: 200_000, status: "completed" },
      500_000,
    );
    expect(result.newStatus).toBe("active");
  });

  it("keeps active when the new target stays above current", () => {
    const result = applyGoalTargetChange(
      { currentAmountCents: 100_000, status: "active" },
      500_000,
    );
    expect(result.newStatus).toBe("active");
  });

  it("rejects cancelled goals", () => {
    expect(() =>
      applyGoalTargetChange(
        { currentAmountCents: 100_000, status: "cancelled" },
        200_000,
      ),
    ).toThrow(GoalNotEditableError);
  });

  it("rejects non-positive targets", () => {
    expect(() =>
      applyGoalTargetChange(
        { currentAmountCents: 100_000, status: "active" },
        0,
      ),
    ).toThrow(InvalidTargetAmountError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-18 — Update cancelled is blocked
// ---------------------------------------------------------------------------
describe("assertCanUpdateGoal — SPEC-08 T-18", () => {
  it("allows active and completed", () => {
    expect(() => assertCanUpdateGoal("active")).not.toThrow();
    expect(() => assertCanUpdateGoal("completed")).not.toThrow();
  });

  it("rejects cancelled", () => {
    expect(() => assertCanUpdateGoal("cancelled")).toThrow(GoalNotEditableError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-19 — Linked account guards
// ---------------------------------------------------------------------------
describe("assertLinkedAccountForGoal — SPEC-08 T-19", () => {
  const valid = {
    id: "acc-1",
    workspaceId: "ws-1",
    currency: "ARS",
    isArchived: false,
  };

  it("accepts a matching active account", () => {
    expect(() =>
      assertLinkedAccountForGoal({
        account: valid,
        goalWorkspaceId: "ws-1",
        goalCurrency: "ARS",
      }),
    ).not.toThrow();
  });

  it("rejects a missing account", () => {
    expect(() =>
      assertLinkedAccountForGoal({
        account: null,
        goalWorkspaceId: "ws-1",
        goalCurrency: "ARS",
      }),
    ).toThrow(GoalLinkedAccountInvalidError);
  });

  it("rejects another workspace", () => {
    expect(() =>
      assertLinkedAccountForGoal({
        account: { ...valid, workspaceId: "ws-2" },
        goalWorkspaceId: "ws-1",
        goalCurrency: "ARS",
      }),
    ).toThrow(GoalLinkedAccountInvalidError);
  });

  it("rejects an archived account", () => {
    expect(() =>
      assertLinkedAccountForGoal({
        account: { ...valid, isArchived: true },
        goalWorkspaceId: "ws-1",
        goalCurrency: "ARS",
      }),
    ).toThrow(GoalLinkedAccountInvalidError);
  });

  it("rejects a currency mismatch", () => {
    expect(() =>
      assertLinkedAccountForGoal({
        account: { ...valid, currency: "USD" },
        goalWorkspaceId: "ws-1",
        goalCurrency: "ARS",
      }),
    ).toThrow(GoalLinkedAccountInvalidError);
  });
});

// ---------------------------------------------------------------------------
// SPEC-08 T-20 — Delete confirmation
// ---------------------------------------------------------------------------
describe("assertDeleteGoalConfirmation — SPEC-08 T-20", () => {
  it("passes when confirmName matches after trim", () => {
    expect(() =>
      assertDeleteGoalConfirmation({
        goalName: "Fondo",
        confirmName: "  Fondo  ",
      }),
    ).not.toThrow();
  });

  it("rejects a different name", () => {
    expect(() =>
      assertDeleteGoalConfirmation({
        goalName: "Fondo",
        confirmName: "Viaje",
      }),
    ).toThrow(GoalDeleteConfirmationMismatchError);
  });

  it("rejects a case mismatch", () => {
    expect(() =>
      assertDeleteGoalConfirmation({
        goalName: "Fondo",
        confirmName: "fondo",
      }),
    ).toThrow(GoalDeleteConfirmationMismatchError);
  });
});
