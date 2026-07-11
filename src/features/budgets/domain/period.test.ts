import { describe, expect, it } from "vitest";
import { getBudgetPeriodBounds } from "./period";
import type { BudgetLike } from "./types";

function budget(overrides: Partial<BudgetLike>): BudgetLike {
  return {
    id: overrides.id ?? "b-1",
    workspaceId: overrides.workspaceId ?? "ws-1",
    name: overrides.name ?? "Comida",
    period: overrides.period ?? "monthly",
    startDate: overrides.startDate ?? new Date("2026-01-01T00:00:00Z"),
    endDate: overrides.endDate ?? null,
    limitCents: overrides.limitCents ?? 100_000,
    currency: overrides.currency ?? "ARS",
    categoryIds: overrides.categoryIds ?? [],
    isArchived: overrides.isArchived ?? false,
  };
}

describe("getBudgetPeriodBounds — monthly", () => {
  it("first period spans startDate to one month later minus one day", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "monthly",
        startDate: new Date("2026-01-15T00:00:00Z"),
      }),
      new Date("2026-01-20T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-02-14");
  });

  it("advances the period when the reference date crosses the anchor day", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "monthly",
        startDate: new Date("2026-01-15T00:00:00Z"),
      }),
      new Date("2026-02-16T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-02-15");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-03-14");
  });

  it("keeps the previous period when reference date is still before the next anchor", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "monthly",
        startDate: new Date("2026-01-15T00:00:00Z"),
      }),
      new Date("2026-02-14T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-02-14");
  });

  it("clamps the anchor day when the target month has fewer days", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "monthly",
        startDate: new Date("2026-01-31T00:00:00Z"),
      }),
      new Date("2026-02-10T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-01-31");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-02-27");
  });

  it("returns the first period when the reference date is before startDate", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "monthly",
        startDate: new Date("2026-03-01T00:00:00Z"),
      }),
      new Date("2026-01-15T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});

describe("getBudgetPeriodBounds — weekly", () => {
  it("first period spans 7 days starting on the anchor day", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "weekly",
        startDate: new Date("2026-01-05T00:00:00Z"),
      }),
      new Date("2026-01-07T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-01-05");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-01-11");
  });

  it("advances the period when the reference date crosses to the next week", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "weekly",
        startDate: new Date("2026-01-05T00:00:00Z"),
      }),
      new Date("2026-01-13T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-01-12");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-01-18");
  });

  it("returns the first period when the reference date is before startDate", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "weekly",
        startDate: new Date("2026-02-01T00:00:00Z"),
      }),
      new Date("2026-01-15T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-02-07");
  });
});

describe("getBudgetPeriodBounds — custom", () => {
  it("uses startDate and endDate verbatim", () => {
    const bounds = getBudgetPeriodBounds(
      budget({
        period: "custom",
        startDate: new Date("2026-01-01T00:00:00Z"),
        endDate: new Date("2026-03-31T00:00:00Z"),
      }),
      new Date("2026-02-15T00:00:00Z"),
    );
    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-03-31");
  });
});
