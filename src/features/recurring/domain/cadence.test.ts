import { describe, expect, it } from "vitest";

import {
  clampToEndOfMonth,
  computeOccurrences,
  isScheduledOccurrence,
} from "./cadence";
import type { RecurringRule } from "./types";

function rule(
  overrides: Partial<RecurringRule> &
    Pick<RecurringRule, "frequency" | "startDate">,
): Pick<
  RecurringRule,
  "frequency" | "startDate" | "endDate" | "status"
> {
  return {
    frequency: overrides.frequency,
    startDate: overrides.startDate,
    endDate: overrides.endDate ?? null,
    status: overrides.status ?? "active",
  };
}

describe("SPEC-18 T-01 — Monthly ancla día 5", () => {
  it("proyecta el día 5 de cada mes", () => {
    const dates = computeOccurrences(
      rule({ frequency: "monthly", startDate: "2026-01-05" }),
      "2026-01-01",
      "2026-04-30",
    );
    expect(dates).toEqual([
      "2026-01-05",
      "2026-02-05",
      "2026-03-05",
      "2026-04-05",
    ]);
  });
});

describe("SPEC-18 T-02 — Monthly ancla día 31 con clamp", () => {
  it("ajusta febrero y meses cortos al último día", () => {
    const dates = computeOccurrences(
      rule({ frequency: "monthly", startDate: "2026-01-31" }),
      "2026-01-01",
      "2026-05-31",
    );
    expect(dates).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });
});

describe("SPEC-18 T-03 — Weekly hereda día de la semana", () => {
  it("proyecta todos los martes desde 2026-08-04", () => {
    const dates = computeOccurrences(
      rule({ frequency: "weekly", startDate: "2026-08-04" }),
      "2026-08-01",
      "2026-09-01",
    );
    expect(dates).toEqual([
      "2026-08-04",
      "2026-08-11",
      "2026-08-18",
      "2026-08-25",
      "2026-09-01",
    ]);
  });
});

describe("SPEC-18 T-04 — Biweekly", () => {
  it("avanza de a 14 días", () => {
    const dates = computeOccurrences(
      rule({ frequency: "biweekly", startDate: "2026-01-02" }),
      "2026-01-01",
      "2026-02-28",
    );
    expect(dates).toEqual([
      "2026-01-02",
      "2026-01-16",
      "2026-01-30",
      "2026-02-13",
      "2026-02-27",
    ]);
  });
});

describe("SPEC-18 T-05 — Yearly 29-feb sin drift", () => {
  it("clampa 29-feb en años no bisiestos", () => {
    const dates = computeOccurrences(
      rule({ frequency: "yearly", startDate: "2024-02-29" }),
      "2024-01-01",
      "2028-12-31",
    );
    expect(dates).toEqual([
      "2024-02-29",
      "2025-02-28",
      "2026-02-28",
      "2027-02-28",
      "2028-02-29",
    ]);
  });
});

describe("SPEC-18 T-06 — endDate respetada", () => {
  it("no proyecta después de endDate", () => {
    const dates = computeOccurrences(
      rule({
        frequency: "monthly",
        startDate: "2026-01-05",
        endDate: "2026-03-05",
      }),
      "2026-01-01",
      "2026-12-31",
    );
    expect(dates).toEqual(["2026-01-05", "2026-02-05", "2026-03-05"]);
  });
});

describe("SPEC-18 T-07 — status paused no proyecta", () => {
  it("devuelve []", () => {
    const dates = computeOccurrences(
      rule({
        frequency: "monthly",
        startDate: "2026-01-05",
        status: "paused",
      }),
      "2026-01-01",
      "2026-12-31",
    );
    expect(dates).toEqual([]);
  });
});

describe("clampToEndOfMonth", () => {
  it("clampa día 31 en abril", () => {
    expect(clampToEndOfMonth(2026, 4, 31)).toBe("2026-04-30");
  });
});

describe("isScheduledOccurrence", () => {
  it("T-19 — día 7 no es ocurrencia de monthly ancla 5", () => {
    expect(
      isScheduledOccurrence(
        { frequency: "monthly", startDate: "2026-01-05", endDate: null },
        "2026-08-07",
      ),
    ).toBe(false);
    expect(
      isScheduledOccurrence(
        { frequency: "monthly", startDate: "2026-01-05", endDate: null },
        "2026-08-05",
      ),
    ).toBe(true);
  });
});
