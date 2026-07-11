import { describe, expect, it } from "vitest";
import { getCurrentMonthPeriod } from "./period";

describe("getCurrentMonthPeriod — SPEC-12 FR-04", () => {
  it("returns UTC month boundaries for a reference date that is safely inside the month", () => {
    const now = new Date("2026-07-10T15:00:00Z");
    const { start, end } = getCurrentMonthPeriod(
      now,
      "America/Argentina/Buenos_Aires",
    );
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("uses the user's timezone: last day of month at 23:00 local (Buenos Aires) is still that month", () => {
    // 2026-07-31 23:00 in America/Argentina/Buenos_Aires (UTC-3)
    // corresponds to 2026-08-01 02:00 UTC.
    const now = new Date("2026-08-01T02:00:00Z");
    const { start, end } = getCurrentMonthPeriod(
      now,
      "America/Argentina/Buenos_Aires",
    );
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("uses the user's timezone: first day of month at 00:30 local (Tokyo) is already next month", () => {
    // 2026-08-01 00:30 in Asia/Tokyo (UTC+9)
    // corresponds to 2026-07-31 15:30 UTC.
    const now = new Date("2026-07-31T15:30:00Z");
    const { start, end } = getCurrentMonthPeriod(now, "Asia/Tokyo");
    expect(start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("wraps December → January correctly", () => {
    const now = new Date("2026-12-15T12:00:00Z");
    const { start, end } = getCurrentMonthPeriod(now, "UTC");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
