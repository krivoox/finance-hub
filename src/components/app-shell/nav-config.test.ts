import { describe, expect, it } from "vitest";

import {
  applyNavBadges,
  budgetNavBadgePresentation,
  navGroups,
  type NavBadges,
} from "./nav-config";

describe("budgetNavBadgePresentation (SPEC-07 nav badge)", () => {
  it("returns null when at-risk is zero or absent", () => {
    expect(budgetNavBadgePresentation({})).toBeNull();
    expect(budgetNavBadgePresentation({ budgetsAtRisk: 0 })).toBeNull();
  });

  it("uses caution severity and warning aria when only warnings", () => {
    expect(
      budgetNavBadgePresentation({ budgetsAtRisk: 2, budgetsExceeded: 0 }),
    ).toEqual({
      count: 2,
      severity: "caution",
      ariaLabel: "Presupuestos: 2 al límite o cerca del límite",
    });
  });

  it("uses critical severity and exceeded aria when any exceeded", () => {
    expect(
      budgetNavBadgePresentation({ budgetsAtRisk: 3, budgetsExceeded: 1 }),
    ).toEqual({
      count: 3,
      severity: "critical",
      ariaLabel:
        "Presupuestos: 3 necesitan atención; hay presupuestos excedidos",
    });
  });

  it("treats missing budgetsExceeded as zero (caution)", () => {
    expect(budgetNavBadgePresentation({ budgetsAtRisk: 1 })).toEqual({
      count: 1,
      severity: "caution",
      ariaLabel: "Presupuestos: 1 al límite o cerca del límite",
    });
  });
});

describe("applyNavBadges", () => {
  const budgetsItems = navGroups.find((g) => g.label === "Planificación")!
    .items;

  it("leaves budgets without badge when signal is empty", () => {
    const [budgets] = applyNavBadges(budgetsItems, {});
    expect(budgets?.badge).toBeUndefined();
    expect(budgets?.badgeSeverity).toBeUndefined();
    expect(budgets?.badgeAriaLabel).toBeUndefined();
  });

  it("sets count + caution without critical icon signal for warnings only", () => {
    const badges: NavBadges = { budgetsAtRisk: 2, budgetsExceeded: 0 };
    const [budgets] = applyNavBadges(budgetsItems, badges);
    expect(budgets?.badge).toBe(2);
    expect(budgets?.badgeSeverity).toBe("caution");
    expect(budgets?.badgeAriaLabel).toContain("al límite");
  });

  it("sets count + critical when there are exceeded budgets", () => {
    const badges: NavBadges = { budgetsAtRisk: 3, budgetsExceeded: 2 };
    const [budgets] = applyNavBadges(budgetsItems, badges);
    expect(budgets?.badge).toBe(3);
    expect(budgets?.badgeSeverity).toBe("critical");
    expect(budgets?.badgeAriaLabel).toContain("excedidos");
  });
});
