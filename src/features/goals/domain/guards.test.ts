import { describe, expect, it } from "vitest";
import {
  GoalNotActiveError,
  InvalidContributionAmountError,
  InvalidGoalNameError,
  InvalidTargetAmountError,
} from "./errors";
import {
  GOAL_NAME_MAX_LENGTH,
  applyContribution,
  assertCanContribute,
  assertValidContribution,
  assertValidGoalName,
  assertValidTargetAmount,
  normalizeGoalName,
  progressPercent,
} from "./guards";

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
