import { describe, expect, it } from "vitest";
import {
  assertValidBudgetLimit,
  assertValidBudgetName,
  assertValidBudgetPeriodBounds,
  BUDGET_NAME_MAX_LENGTH,
  InvalidBudgetEndDateError,
  InvalidBudgetLimitError,
  InvalidBudgetNameError,
  MissingBudgetEndDateError,
  UnexpectedBudgetEndDateError,
} from "./index";

describe("assertValidBudgetName", () => {
  it("accepts a trimmed non-empty name", () => {
    expect(() => assertValidBudgetName("Comida")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => assertValidBudgetName("")).toThrow(InvalidBudgetNameError);
  });

  it("rejects whitespace-only input", () => {
    expect(() => assertValidBudgetName("   ")).toThrow(InvalidBudgetNameError);
  });

  it("rejects strings longer than the limit", () => {
    const tooLong = "a".repeat(BUDGET_NAME_MAX_LENGTH + 1);
    expect(() => assertValidBudgetName(tooLong)).toThrow(InvalidBudgetNameError);
  });
});

describe("assertValidBudgetLimit — SPEC-07 §4 limit > 0", () => {
  it("accepts a positive integer", () => {
    expect(() => assertValidBudgetLimit(100_000)).not.toThrow();
  });

  it("rejects zero", () => {
    expect(() => assertValidBudgetLimit(0)).toThrow(InvalidBudgetLimitError);
  });

  it("rejects negative amounts", () => {
    expect(() => assertValidBudgetLimit(-1)).toThrow(InvalidBudgetLimitError);
  });

  it("rejects non-integer amounts", () => {
    expect(() => assertValidBudgetLimit(100.5)).toThrow(InvalidBudgetLimitError);
  });

  it("rejects NaN / Infinity", () => {
    expect(() => assertValidBudgetLimit(NaN)).toThrow(InvalidBudgetLimitError);
    expect(() => assertValidBudgetLimit(Infinity)).toThrow(
      InvalidBudgetLimitError,
    );
  });
});

describe("assertValidBudgetPeriodBounds", () => {
  const start = new Date("2026-01-15T00:00:00Z");

  it("monthly does not require endDate", () => {
    expect(() =>
      assertValidBudgetPeriodBounds("monthly", start, null),
    ).not.toThrow();
  });

  it("weekly does not require endDate", () => {
    expect(() =>
      assertValidBudgetPeriodBounds("weekly", start, null),
    ).not.toThrow();
  });

  it("monthly rejects an explicit endDate", () => {
    expect(() =>
      assertValidBudgetPeriodBounds(
        "monthly",
        start,
        new Date("2026-02-14T00:00:00Z"),
      ),
    ).toThrow(UnexpectedBudgetEndDateError);
  });

  it("custom without endDate throws MissingBudgetEndDateError", () => {
    expect(() =>
      assertValidBudgetPeriodBounds("custom", start, null),
    ).toThrow(MissingBudgetEndDateError);
  });

  it("custom with endDate before startDate throws InvalidBudgetEndDateError", () => {
    expect(() =>
      assertValidBudgetPeriodBounds(
        "custom",
        start,
        new Date("2026-01-14T00:00:00Z"),
      ),
    ).toThrow(InvalidBudgetEndDateError);
  });

  it("custom with endDate equal to startDate is accepted", () => {
    expect(() =>
      assertValidBudgetPeriodBounds("custom", start, start),
    ).not.toThrow();
  });

  it("custom with a valid endDate is accepted", () => {
    expect(() =>
      assertValidBudgetPeriodBounds(
        "custom",
        start,
        new Date("2026-02-15T00:00:00Z"),
      ),
    ).not.toThrow();
  });
});
