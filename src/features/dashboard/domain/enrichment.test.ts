import { describe, expect, it } from "vitest";
import {
  selectActiveGoalsProgress,
  selectBudgetsAtRisk,
} from "./enrichment";

describe("selectBudgetsAtRisk (SPEC-12 T-03)", () => {
  it("keeps only warning and exceeded non-archived budgets", () => {
    const result = selectBudgetsAtRisk([
      {
        id: "1",
        name: "Comida",
        isArchived: false,
        limitCents: 100,
        progress: {
          status: "exceeded" as const,
          spentCents: 110,
          remainingCents: -10,
        },
      },
      {
        id: "2",
        name: "Ocio",
        isArchived: false,
        limitCents: 100,
        progress: {
          status: "on_track" as const,
          spentCents: 10,
          remainingCents: 90,
        },
      },
      {
        id: "3",
        name: "Old",
        isArchived: true,
        limitCents: 100,
        progress: {
          status: "warning" as const,
          spentCents: 80,
          remainingCents: 20,
        },
      },
      {
        id: "4",
        name: "Transporte",
        isArchived: false,
        limitCents: 100,
        progress: {
          status: "warning" as const,
          spentCents: 85,
          remainingCents: 15,
        },
      },
    ]);

    expect(result.map((b) => b.id)).toEqual(["1", "4"]);
  });
});

describe("selectActiveGoalsProgress", () => {
  it("filters to active goals only", () => {
    const result = selectActiveGoalsProgress([
      {
        id: "g1",
        name: "Fondo",
        kind: "save",
        progressPercent: 40,
        currentAmountCents: 200,
        targetAmountCents: 500,
        status: "active",
      },
      {
        id: "g2",
        name: "Done",
        kind: "save",
        progressPercent: 100,
        currentAmountCents: 500,
        targetAmountCents: 500,
        status: "completed",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("g1");
  });
});
