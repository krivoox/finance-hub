import { describe, expect, it } from "vitest";

import { summarizeBudgetNavSignal } from "./nav-signal";
import type { BudgetStatus } from "./types";

function budget(status: BudgetStatus, isArchived = false) {
  return { isArchived, progress: { status } };
}

describe("summarizeBudgetNavSignal (SPEC-07 nav badge)", () => {
  it("returns zeros when no budgets are at risk", () => {
    expect(
      summarizeBudgetNavSignal([
        budget("on_track"),
        budget("on_track"),
        budget("warning", true),
        budget("exceeded", true),
      ]),
    ).toEqual({ atRisk: 0, exceeded: 0 });
  });

  it("counts only warning as atRisk without exceeded", () => {
    expect(
      summarizeBudgetNavSignal([
        budget("on_track"),
        budget("warning"),
        budget("warning"),
      ]),
    ).toEqual({ atRisk: 2, exceeded: 0 });
  });

  it("counts exceeded toward both atRisk and exceeded", () => {
    expect(
      summarizeBudgetNavSignal([budget("exceeded"), budget("on_track")]),
    ).toEqual({ atRisk: 1, exceeded: 1 });
  });

  it("sums warning + exceeded into atRisk and isolates exceeded", () => {
    expect(
      summarizeBudgetNavSignal([
        budget("warning"),
        budget("exceeded"),
        budget("exceeded"),
        budget("on_track"),
        budget("warning", true),
      ]),
    ).toEqual({ atRisk: 3, exceeded: 2 });
  });
});
