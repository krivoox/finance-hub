import { describe, expect, it } from "vitest";

import {
  assertCanMaterializeRule,
  assertIsScheduledOccurrence,
  assertNotAlreadyMaterialized,
  canMaterializeOn,
  resolveOccurredOn,
} from "./materialize";
import {
  AlreadyMaterializedError,
  CannotMaterializeRuleError,
  NotAScheduledOccurrenceError,
  RecurringRuleEndedError,
  TooEarlyToMaterializeError,
} from "./errors";

describe("SPEC-18 materialize helpers", () => {
  it("T-13 — AlreadyMaterialized", () => {
    expect(() =>
      assertNotAlreadyMaterialized("r1", "2026-08-05", new Set(["2026-08-05"])),
    ).toThrow(AlreadyMaterializedError);
  });

  it("T-14 — occurredOn = scheduledOn when past", () => {
    expect(resolveOccurredOn("2026-08-01", "2026-08-05")).toBe("2026-08-01");
  });

  it("T-15 — TooEarlyToMaterialize", () => {
    expect(() => resolveOccurredOn("2026-08-10", "2026-08-05")).toThrow(
      TooEarlyToMaterializeError,
    );
  });

  it("T-16 — today + 1 permitido", () => {
    expect(resolveOccurredOn("2026-08-06", "2026-08-05")).toBe("2026-08-06");
  });

  it("T-17 — override válido", () => {
    expect(resolveOccurredOn("2026-08-01", "2026-08-05", "2026-08-03")).toBe(
      "2026-08-03",
    );
  });

  it("T-18 — override futuro > hoy+1", () => {
    expect(() =>
      resolveOccurredOn("2026-08-01", "2026-08-05", "2026-08-10"),
    ).toThrow(TooEarlyToMaterializeError);
  });

  it("T-19 — NotAScheduledOccurrence", () => {
    expect(() =>
      assertIsScheduledOccurrence(
        {
          frequency: "monthly",
          startDate: "2026-01-05",
          endDate: null,
        },
        "2026-08-07",
      ),
    ).toThrow(NotAScheduledOccurrenceError);
  });

  it("T-29 — paused manual permite materializar", () => {
    expect(() =>
      assertCanMaterializeRule({
        status: "paused",
        pausedReason: "manual",
      }),
    ).not.toThrow();
  });

  it("T-30 — ended falla", () => {
    expect(() =>
      assertCanMaterializeRule({ status: "ended", pausedReason: null }),
    ).toThrow(RecurringRuleEndedError);
  });

  it("paused account_archived no permite", () => {
    expect(() =>
      assertCanMaterializeRule({
        status: "paused",
        pausedReason: "account_archived",
      }),
    ).toThrow(CannotMaterializeRuleError);
  });
});

describe("SPEC-18 canMaterializeOn — ventana de confirmación", () => {
  it("vencida es confirmable", () => {
    expect(canMaterializeOn("2026-08-01", "2026-08-05")).toBe(true);
  });

  it("hoy es confirmable", () => {
    expect(canMaterializeOn("2026-08-05", "2026-08-05")).toBe(true);
  });

  it("mañana es confirmable (mismo límite que resolveOccurredOn)", () => {
    expect(canMaterializeOn("2026-08-06", "2026-08-05")).toBe(true);
  });

  it("pasado mañana todavía no", () => {
    expect(canMaterializeOn("2026-08-07", "2026-08-05")).toBe(false);
  });

  it("muy futura no", () => {
    expect(canMaterializeOn("2026-09-03", "2026-08-05")).toBe(false);
  });

  it("coincide con el error de resolveOccurredOn", () => {
    const today = "2026-08-05";
    for (const scheduledOn of ["2026-08-04", "2026-08-06", "2026-08-07"]) {
      const allowed = canMaterializeOn(scheduledOn, today);
      let threw = false;
      try {
        resolveOccurredOn(scheduledOn, today);
      } catch {
        threw = true;
      }
      expect(allowed).toBe(!threw);
    }
  });
});
