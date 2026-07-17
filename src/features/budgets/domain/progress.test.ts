import { describe, expect, it } from "vitest";
import {
  computeBudgetProgress,
  computeBudgetRemaining,
  computeBudgetSpent,
  computeBudgetStatus,
  listMatchingBudgetExpenses,
} from "./progress";
import type { BudgetExpenseCandidate, BudgetLike } from "./types";

function budget(overrides: Partial<BudgetLike>): BudgetLike {
  return {
    id: overrides.id ?? "b-1",
    workspaceId: overrides.workspaceId ?? "ws-1",
    name: overrides.name ?? "Comida",
    period: overrides.period ?? "monthly",
    startDate: overrides.startDate ?? new Date("2026-07-01T00:00:00Z"),
    endDate: overrides.endDate ?? null,
    limitCents: overrides.limitCents ?? 100_000,
    currency: overrides.currency ?? "ARS",
    categoryIds: overrides.categoryIds ?? ["cat-food"],
    isArchived: overrides.isArchived ?? false,
  };
}

function tx(
  overrides: Partial<BudgetExpenseCandidate>,
): BudgetExpenseCandidate {
  return {
    type: overrides.type ?? "expense",
    amountCents: overrides.amountCents ?? 1_000,
    occurredOn: overrides.occurredOn ?? new Date("2026-07-05T00:00:00Z"),
    categoryId:
      "categoryId" in overrides ? (overrides.categoryId ?? null) : "cat-food",
    currency: overrides.currency,
  };
}

// ---------------------------------------------------------------------------
// SPEC-07 T-01 — Spent básico
// ---------------------------------------------------------------------------
describe("SPEC-07 T-01 — spent básico", () => {
  it("suma 40000 y remaining es 60000 en un budget de 100000", () => {
    const b = budget({ limitCents: 100_000, categoryIds: ["cat-food"] });
    const progress = computeBudgetProgress(
      b,
      [tx({ amountCents: 40_000, categoryId: "cat-food" })],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(progress.spentCents).toBe(40_000);
    expect(progress.remainingCents).toBe(60_000);
    expect(progress.status).toBe("on_track");
  });
});

// ---------------------------------------------------------------------------
// SPEC-07 T-02 — Warning
// ---------------------------------------------------------------------------
describe("SPEC-07 T-02 — warning al 80%", () => {
  it("status warning cuando spent llega al 80% del límite", () => {
    expect(computeBudgetStatus(80_000, 100_000)).toBe("warning");
  });

  it("status warning cuando spent supera 80% pero no llega al 100%", () => {
    expect(computeBudgetStatus(95_000, 100_000)).toBe("warning");
  });

  it("status on_track justo antes del 80%", () => {
    expect(computeBudgetStatus(79_999, 100_000)).toBe("on_track");
  });
});

// ---------------------------------------------------------------------------
// SPEC-07 T-03 — Exceeded
// ---------------------------------------------------------------------------
describe("SPEC-07 T-03 — exceeded al superar el 100%", () => {
  it("status exceeded cuando spent > límite y remaining puede ser negativo", () => {
    expect(computeBudgetStatus(100_001, 100_000)).toBe("exceeded");
    expect(computeBudgetRemaining(100_000, 100_001)).toBe(-1);
  });

  it("status warning (no exceeded) cuando spent === límite exacto", () => {
    expect(computeBudgetStatus(100_000, 100_000)).toBe("warning");
  });
});

// ---------------------------------------------------------------------------
// SPEC-07 T-04 — Expenses fuera de periodo no cuentan
// ---------------------------------------------------------------------------
describe("SPEC-07 T-04 — expenses fuera del periodo no cuentan", () => {
  it("una expense de un mes previo no suma a spent", () => {
    const b = budget({
      period: "monthly",
      startDate: new Date("2026-07-01T00:00:00Z"),
      categoryIds: ["cat-food"],
    });
    const spent = computeBudgetSpent(
      b,
      [tx({ occurredOn: new Date("2026-06-20T00:00:00Z"), amountCents: 5_000 })],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(0);
  });

  it("una expense posterior al fin del periodo no suma", () => {
    const b = budget({
      period: "monthly",
      startDate: new Date("2026-07-01T00:00:00Z"),
      categoryIds: ["cat-food"],
    });
    const spent = computeBudgetSpent(
      b,
      [tx({ occurredOn: new Date("2026-08-05T00:00:00Z"), amountCents: 5_000 })],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(0);
  });

  it("los bordes de inicio y fin son inclusivos", () => {
    const b = budget({
      period: "monthly",
      startDate: new Date("2026-07-01T00:00:00Z"),
      categoryIds: ["cat-food"],
    });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          occurredOn: new Date("2026-07-01T00:00:00Z"),
          amountCents: 1_000,
        }),
        tx({
          occurredOn: new Date("2026-07-31T00:00:00Z"),
          amountCents: 2_000,
        }),
      ],
      new Date("2026-07-15T00:00:00Z"),
    );
    expect(spent).toBe(3_000);
  });
});

// ---------------------------------------------------------------------------
// SPEC-07 T-05 — Transfers y ingresos ignorados
// ---------------------------------------------------------------------------
describe("SPEC-07 T-05 — transfers/incomes se ignoran", () => {
  it("las transferencias en el periodo no suman a spent", () => {
    const b = budget({ categoryIds: [] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          type: "transfer",
          amountCents: 100_000,
          categoryId: null,
          occurredOn: new Date("2026-07-05T00:00:00Z"),
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(0);
  });

  it("los ingresos en el periodo no suman a spent", () => {
    const b = budget({ categoryIds: [] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          type: "income",
          amountCents: 50_000,
          categoryId: "cat-salary",
          occurredOn: new Date("2026-07-05T00:00:00Z"),
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(0);
  });
});

describe("SPEC-07 T-05b — otra moneda ignorada", () => {
  it("expense USD no suma a budget ARS", () => {
    const b = budget({ currency: "ARS", categoryIds: ["cat-food"] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          amountCents: 40_000,
          categoryId: "cat-food",
          currency: "USD",
        }),
        tx({
          amountCents: 10_000,
          categoryId: "cat-food",
          currency: "ARS",
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// SPEC-07 T-06 — categoryIds vacío = todas las categorías expense
// ---------------------------------------------------------------------------
describe("SPEC-07 T-06 — categoryIds vacío suma cualquier expense", () => {
  it("expenses de cualquier categoría en el periodo suman a spent", () => {
    const b = budget({ categoryIds: [] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          amountCents: 3_000,
          categoryId: "cat-food",
          occurredOn: new Date("2026-07-05T00:00:00Z"),
        }),
        tx({
          amountCents: 5_000,
          categoryId: "cat-transport",
          occurredOn: new Date("2026-07-06T00:00:00Z"),
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(8_000);
  });

  it("expenses sin categoryId también suman cuando categoryIds está vacío", () => {
    const b = budget({ categoryIds: [] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          amountCents: 2_500,
          categoryId: null,
          occurredOn: new Date("2026-07-05T00:00:00Z"),
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(2_500);
  });
});

// ---------------------------------------------------------------------------
// Extra — Category filtering when categoryIds is provided
// ---------------------------------------------------------------------------
describe("computeBudgetSpent — filtra por categoryIds cuando no está vacío", () => {
  it("solo suma expenses cuya categoryId está en el conjunto del budget", () => {
    const b = budget({ categoryIds: ["cat-food"] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          amountCents: 3_000,
          categoryId: "cat-food",
          occurredOn: new Date("2026-07-05T00:00:00Z"),
        }),
        tx({
          amountCents: 5_000,
          categoryId: "cat-transport",
          occurredOn: new Date("2026-07-06T00:00:00Z"),
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(3_000);
  });

  it("expenses sin categoría no suman cuando el budget filtra por categorías", () => {
    const b = budget({ categoryIds: ["cat-food"] });
    const spent = computeBudgetSpent(
      b,
      [
        tx({
          amountCents: 4_000,
          categoryId: null,
          occurredOn: new Date("2026-07-05T00:00:00Z"),
        }),
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(spent).toBe(0);
  });
});

describe("computeBudgetRemaining", () => {
  it("returns limit - spent", () => {
    expect(computeBudgetRemaining(100, 40)).toBe(60);
  });

  it("puede ser negativo cuando spent supera el límite", () => {
    expect(computeBudgetRemaining(100, 250)).toBe(-150);
  });
});

// ---------------------------------------------------------------------------
// listMatchingBudgetExpenses — detalle de movimientos del presupuesto
// ---------------------------------------------------------------------------
describe("listMatchingBudgetExpenses", () => {
  it("devuelve solo expenses del periodo y categorías, preservando campos extra", () => {
    const b = budget({ categoryIds: ["cat-food"] });
    const matching = listMatchingBudgetExpenses(
      b,
      [
        {
          ...tx({
            amountCents: 3_000,
            categoryId: "cat-food",
            occurredOn: new Date("2026-07-05T00:00:00Z"),
          }),
          id: "tx-in",
        },
        {
          ...tx({
            amountCents: 5_000,
            categoryId: "cat-transport",
            occurredOn: new Date("2026-07-06T00:00:00Z"),
          }),
          id: "tx-other-cat",
        },
        {
          ...tx({
            amountCents: 2_000,
            categoryId: "cat-food",
            occurredOn: new Date("2026-06-20T00:00:00Z"),
          }),
          id: "tx-out-of-period",
        },
        {
          type: "transfer" as const,
          amountCents: 9_000,
          occurredOn: new Date("2026-07-05T00:00:00Z"),
          categoryId: null,
          id: "tx-transfer",
        },
      ],
      new Date("2026-07-10T00:00:00Z"),
    );

    expect(matching).toHaveLength(1);
    expect(matching[0]?.id).toBe("tx-in");
    expect(matching[0]?.amountCents).toBe(3_000);
  });

  it("con categoryIds vacío incluye cualquier expense del periodo", () => {
    const b = budget({ categoryIds: [] });
    const matching = listMatchingBudgetExpenses(
      b,
      [
        {
          ...tx({
            amountCents: 1_000,
            categoryId: "cat-a",
            occurredOn: new Date("2026-07-05T00:00:00Z"),
          }),
          id: "a",
        },
        {
          ...tx({
            amountCents: 2_000,
            categoryId: "cat-b",
            occurredOn: new Date("2026-07-06T00:00:00Z"),
          }),
          id: "b",
        },
      ],
      new Date("2026-07-10T00:00:00Z"),
    );
    expect(matching.map((m) => m.id).toSorted()).toEqual(["a", "b"]);
  });
});
