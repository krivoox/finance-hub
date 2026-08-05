import { describe, expect, it } from "vitest";

import { buildNetTrend } from "./net-trend";
import type { MonthlySeriesPoint } from "./analytics-types";

function point(
  yearMonth: string,
  incomeCents: number,
  expenseCents: number,
): MonthlySeriesPoint {
  return { yearMonth, incomeCents, expenseCents };
}

describe("buildNetTrend (SPEC-12 §4 — neto por mes)", () => {
  it("returns net per month preserving series order", () => {
    const trend = buildNetTrend([
      point("2026-05", 100_000, 40_000),
      point("2026-06", 50_000, 80_000),
    ]);

    expect(trend.points).toEqual([
      {
        yearMonth: "2026-05",
        incomeCents: 100_000,
        expenseCents: 40_000,
        netCents: 60_000,
      },
      {
        yearMonth: "2026-06",
        incomeCents: 50_000,
        expenseCents: 80_000,
        netCents: -30_000,
      },
    ]);
  });

  it("exposes current and previous month nets", () => {
    const trend = buildNetTrend([
      point("2026-04", 10_000, 0),
      point("2026-05", 100_000, 40_000),
      point("2026-06", 50_000, 20_000),
    ]);

    expect(trend.currentNetCents).toBe(30_000);
    expect(trend.previousNetCents).toBe(60_000);
  });

  it("computes variation vs previous month rounded to one decimal", () => {
    const trend = buildNetTrend([
      point("2026-05", 60_000, 0),
      point("2026-06", 90_000, 0),
    ]);

    expect(trend.variationPercent).toBe(50);
  });

  it("returns negative variation when the month got worse", () => {
    const trend = buildNetTrend([
      point("2026-05", 100_000, 0),
      point("2026-06", 25_000, 0),
    ]);

    expect(trend.variationPercent).toBe(-75);
  });

  it("uses the magnitude of the previous net so sign flips read correctly", () => {
    const trend = buildNetTrend([
      point("2026-05", 0, 40_000),
      point("2026-06", 20_000, 0),
    ]);

    expect(trend.previousNetCents).toBe(-40_000);
    expect(trend.variationPercent).toBe(150);
  });

  it("has no variation when the previous month is zero", () => {
    const trend = buildNetTrend([
      point("2026-05", 0, 0),
      point("2026-06", 20_000, 0),
    ]);

    expect(trend.variationPercent).toBeNull();
  });

  it("has no variation when there is a single month", () => {
    const trend = buildNetTrend([point("2026-06", 20_000, 0)]);

    expect(trend.previousNetCents).toBeNull();
    expect(trend.variationPercent).toBeNull();
  });

  it("returns an empty trend for an empty series", () => {
    const trend = buildNetTrend([]);

    expect(trend.points).toEqual([]);
    expect(trend.currentNetCents).toBe(0);
    expect(trend.previousNetCents).toBeNull();
    expect(trend.variationPercent).toBeNull();
  });

  it("reports the largest absolute net so charts can scale", () => {
    const trend = buildNetTrend([
      point("2026-05", 0, 90_000),
      point("2026-06", 20_000, 0),
    ]);

    expect(trend.maxAbsNetCents).toBe(90_000);
  });

  it("reports max income and expense for chart mode scaling", () => {
    const trend = buildNetTrend([
      point("2026-05", 10_000, 90_000),
      point("2026-06", 80_000, 5_000),
    ]);

    expect(trend.maxIncomeCents).toBe(80_000);
    expect(trend.maxExpenseCents).toBe(90_000);
  });
});
