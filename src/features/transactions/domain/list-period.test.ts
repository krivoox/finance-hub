import { describe, expect, it } from "vitest";
import { InvalidDateRangeError } from "./errors";
import {
  LIST_PAGE_SIZE,
  normalizeListPeriod,
  resolveListPeriod,
} from "./list-period";

const TZ = "America/Argentina/Buenos_Aires";

describe("LIST_PAGE_SIZE — SPEC-05 §4.5", () => {
  it("is fixed at 25 for MVP", () => {
    expect(LIST_PAGE_SIZE).toBe(25);
  });
});

describe("resolveListPeriod — SPEC-05 T-08…T-15, T-19", () => {
  // T-08: wall clock July 31 23:00 BA → July month
  const nowCrossMonth = new Date("2026-08-01T02:00:00Z");

  it("T-08: default / this_month uses calendar month in timezone", () => {
    const expected = {
      kind: "bounded" as const,
      from: "2026-07-01",
      to: "2026-07-31",
    };
    expect(
      resolveListPeriod({
        period: undefined,
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual(expected);
    expect(
      resolveListPeriod({
        period: "this_month",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual(expected);
  });

  it("T-09: this_week is Mon–Sun in timezone", () => {
    // Wed 2026-07-15 local BA
    const now = new Date("2026-07-15T15:00:00Z");
    expect(
      resolveListPeriod({
        period: "this_week",
        now,
        timezone: TZ,
      }),
    ).toEqual({
      kind: "bounded",
      from: "2026-07-13",
      to: "2026-07-19",
    });
  });

  it("T-10: all is unbounded", () => {
    expect(
      resolveListPeriod({
        period: "all",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual({ kind: "unbounded" });
  });

  it("T-11: custom single day is valid", () => {
    expect(
      resolveListPeriod({
        period: "custom",
        from: "2026-01-01",
        to: "2026-01-01",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual({
      kind: "bounded",
      from: "2026-01-01",
      to: "2026-01-01",
    });
  });

  it("T-12: custom from > to throws InvalidDateRange", () => {
    expect(() =>
      resolveListPeriod({
        period: "custom",
        from: "2026-02-01",
        to: "2026-01-01",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toThrow(InvalidDateRangeError);
  });

  it("T-13: custom span > 366 days throws InvalidDateRange", () => {
    // Inclusive span 2025-01-01 … 2026-01-02 = 367 days
    expect(() =>
      resolveListPeriod({
        period: "custom",
        from: "2025-01-01",
        to: "2026-01-02",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toThrow(InvalidDateRangeError);
  });

  it("T-13b: custom span of exactly 366 days is allowed", () => {
    expect(
      resolveListPeriod({
        period: "custom",
        from: "2025-01-01",
        to: "2026-01-01",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual({
      kind: "bounded",
      from: "2025-01-01",
      to: "2026-01-01",
    });
  });

  it("T-14: custom without from or to throws InvalidDateRange", () => {
    expect(() =>
      resolveListPeriod({
        period: "custom",
        from: "2026-01-01",
        to: undefined,
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toThrow(InvalidDateRangeError);

    expect(() =>
      resolveListPeriod({
        period: "custom",
        from: null,
        to: "2026-01-01",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toThrow(InvalidDateRangeError);
  });

  it("T-15: ignores from/to when period is not custom", () => {
    expect(
      resolveListPeriod({
        period: "this_month",
        from: "2020-01-01",
        to: "2020-01-31",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual({
      kind: "bounded",
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });

  it("T-19: unknown period normalizes to this_month", () => {
    expect(normalizeListPeriod("nope")).toBe("this_month");
    expect(
      resolveListPeriod({
        period: "nope",
        now: nowCrossMonth,
        timezone: TZ,
      }),
    ).toEqual({
      kind: "bounded",
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });
});
