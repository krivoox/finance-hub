import type { SpendingByCategoryRow } from "./analytics-types";

export type CashflowSankeyNodeKind =
  | "income"
  | "deficit"
  | "hub"
  | "expense"
  | "surplus"
  | "account";

export type CashflowSankeyNode = {
  id: string;
  label: string;
  amountCents: number;
  kind: CashflowSankeyNodeKind;
};

export type CashflowSankeyLink = {
  sourceId: string;
  targetId: string;
  amountCents: number;
};

export type CashflowSankey = {
  nodes: CashflowSankeyNode[];
  links: CashflowSankeyLink[];
};

export type BuildCashflowSankeyInput = {
  incomeCents: number;
  expenseCents: number;
  spendingByCategory: readonly SpendingByCategoryRow[];
  /** Top expense categories before grouping into "Otros". Default 4. */
  maxCategories?: number;
};

/**
 * Pure read-model for a monthly cashflow Sankey:
 * income (+ deficit if needed) → hub → expense categories + surplus.
 *
 * Amounts are cents; links conserve mass at the hub.
 */
export function buildCashflowSankey(
  input: BuildCashflowSankeyInput,
): CashflowSankey {
  const incomeCents = Math.max(0, input.incomeCents);
  const expenseCents = Math.max(0, input.expenseCents);
  const maxCategories = input.maxCategories ?? 4;

  if (incomeCents === 0 && expenseCents === 0) {
    return { nodes: [], links: [] };
  }

  const hubCents = Math.max(incomeCents, expenseCents);
  const deficitCents = Math.max(0, expenseCents - incomeCents);
  const surplusCents = Math.max(0, incomeCents - expenseCents);

  const nodes: CashflowSankeyNode[] = [];
  const links: CashflowSankeyLink[] = [];

  if (incomeCents > 0) {
    nodes.push({
      id: "income",
      label: "Ingresos",
      amountCents: incomeCents,
      kind: "income",
    });
    links.push({
      sourceId: "income",
      targetId: "hub",
      amountCents: incomeCents,
    });
  }

  if (deficitCents > 0) {
    nodes.push({
      id: "deficit",
      label: "Déficit",
      amountCents: deficitCents,
      kind: "deficit",
    });
    links.push({
      sourceId: "deficit",
      targetId: "hub",
      amountCents: deficitCents,
    });
  }

  nodes.push({
    id: "hub",
    label: "Flujo del mes",
    amountCents: hubCents,
    kind: "hub",
  });

  const ranked = input.spendingByCategory
    .filter((row) => row.amountCents > 0)
    .toSorted((a, b) => b.amountCents - a.amountCents);

  const top = ranked.slice(0, maxCategories);
  const rest = ranked.slice(maxCategories);
  const restCents = rest.reduce((sum, row) => sum + row.amountCents, 0);
  const categorizedCents =
    top.reduce((sum, row) => sum + row.amountCents, 0) + restCents;
  const uncategorizedCents = Math.max(0, expenseCents - categorizedCents);

  for (const row of top) {
    const id = `expense:${row.categoryId}`;
    nodes.push({
      id,
      label: row.categoryName,
      amountCents: row.amountCents,
      kind: "expense",
    });
    links.push({
      sourceId: "hub",
      targetId: id,
      amountCents: row.amountCents,
    });
  }

  if (restCents > 0) {
    nodes.push({
      id: "expense:other",
      label: "Otros",
      amountCents: restCents,
      kind: "expense",
    });
    links.push({
      sourceId: "hub",
      targetId: "expense:other",
      amountCents: restCents,
    });
  }

  if (uncategorizedCents > 0) {
    nodes.push({
      id: "expense:uncategorized",
      label: "Sin categoría",
      amountCents: uncategorizedCents,
      kind: "expense",
    });
    links.push({
      sourceId: "hub",
      targetId: "expense:uncategorized",
      amountCents: uncategorizedCents,
    });
  }

  if (surplusCents > 0) {
    nodes.push({
      id: "surplus",
      label: "Disponible",
      amountCents: surplusCents,
      kind: "surplus",
    });
    links.push({
      sourceId: "hub",
      targetId: "surplus",
      amountCents: surplusCents,
    });
  }

  return { nodes, links };
}
