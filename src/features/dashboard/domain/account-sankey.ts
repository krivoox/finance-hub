import type { AnalyticsTransaction } from "./analytics-types";
import type { CashflowSankey, CashflowSankeyLink, CashflowSankeyNode } from "./cashflow-sankey";

export type SpendingFlow = {
  accountId: string;
  accountName: string;
  categoryId: string;
  categoryName: string;
  amountCents: number;
};

export type BuildAccountExpenseSankeyInput = {
  flows: readonly SpendingFlow[];
  /** Top accounts before grouping into "Otras cuentas". Default 4. */
  maxAccounts?: number;
  /** Top categories before grouping into "Otros". Default 4. */
  maxCategories?: number;
};

/**
 * Aggregate expenses as account → category flows. Transfers/income excluded.
 */
export function aggregateSpendingFlows(
  transactions: readonly AnalyticsTransaction[],
): SpendingFlow[] {
  const map = new Map<string, SpendingFlow>();

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    if (tx.amountCents <= 0) continue;

    const accountId = tx.accountId ?? "_unknown";
    const accountName = tx.accountName?.trim() || "Sin cuenta";
    const categoryId = tx.categoryId ?? "_uncategorized";
    const categoryName = tx.categoryName?.trim() || "Sin categoría";
    const key = `${accountId}::${categoryId}`;

    const existing = map.get(key);
    if (existing) {
      existing.amountCents += tx.amountCents;
    } else {
      map.set(key, {
        accountId,
        accountName,
        categoryId,
        categoryName,
        amountCents: tx.amountCents,
      });
    }
  }

  return [...map.values()].toSorted((a, b) => b.amountCents - a.amountCents);
}

/**
 * Pure read-model: accounts → expense categories (no hub).
 * Overflow accounts/categories are merged into "Otros".
 */
export function buildAccountExpenseSankey(
  input: BuildAccountExpenseSankeyInput,
): CashflowSankey {
  const maxAccounts = input.maxAccounts ?? 4;
  const maxCategories = input.maxCategories ?? 4;
  const flows = input.flows.filter((f) => f.amountCents > 0);

  if (flows.length === 0) {
    return { nodes: [], links: [] };
  }

  const accountTotals = new Map<string, { name: string; cents: number }>();
  const categoryTotals = new Map<string, { name: string; cents: number }>();

  for (const flow of flows) {
    const acc = accountTotals.get(flow.accountId);
    if (acc) acc.cents += flow.amountCents;
    else
      accountTotals.set(flow.accountId, {
        name: flow.accountName,
        cents: flow.amountCents,
      });

    const cat = categoryTotals.get(flow.categoryId);
    if (cat) cat.cents += flow.amountCents;
    else
      categoryTotals.set(flow.categoryId, {
        name: flow.categoryName,
        cents: flow.amountCents,
      });
  }

  const topAccountIds = [...accountTotals.entries()]
    .toSorted((a, b) => b[1].cents - a[1].cents)
    .slice(0, maxAccounts)
    .map(([id]) => id);
  const topAccountSet = new Set(topAccountIds);

  const topCategoryIds = [...categoryTotals.entries()]
    .toSorted((a, b) => b[1].cents - a[1].cents)
    .slice(0, maxCategories)
    .map(([id]) => id);
  const topCategorySet = new Set(topCategoryIds);

  const linkMap = new Map<string, CashflowSankeyLink>();
  const accountAmounts = new Map<string, number>();
  const categoryAmounts = new Map<string, number>();
  const accountLabels = new Map<string, string>();
  const categoryLabels = new Map<string, string>();

  for (const flow of flows) {
    const accountId = topAccountSet.has(flow.accountId)
      ? flow.accountId
      : "_other";
    const categoryId = topCategorySet.has(flow.categoryId)
      ? flow.categoryId
      : "_other";

    const sourceId = `account:${accountId === "_other" ? "other" : accountId}`;
    const targetId = `expense:${categoryId === "_other" ? "other" : categoryId}`;

    accountLabels.set(
      sourceId,
      accountId === "_other" ? "Otras cuentas" : flow.accountName,
    );
    categoryLabels.set(
      targetId,
      categoryId === "_other" ? "Otros" : flow.categoryName,
    );

    accountAmounts.set(
      sourceId,
      (accountAmounts.get(sourceId) ?? 0) + flow.amountCents,
    );
    categoryAmounts.set(
      targetId,
      (categoryAmounts.get(targetId) ?? 0) + flow.amountCents,
    );

    const linkKey = `${sourceId}->${targetId}`;
    const existing = linkMap.get(linkKey);
    if (existing) {
      existing.amountCents += flow.amountCents;
    } else {
      linkMap.set(linkKey, {
        sourceId,
        targetId,
        amountCents: flow.amountCents,
      });
    }
  }

  const accountNodes: CashflowSankeyNode[] = [...accountAmounts.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .map(([id, amountCents]) => ({
      id,
      label: accountLabels.get(id) ?? id,
      amountCents,
      kind: "account" as const,
    }));

  const expenseNodes: CashflowSankeyNode[] = [...categoryAmounts.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .map(([id, amountCents]) => ({
      id,
      label: categoryLabels.get(id) ?? id,
      amountCents,
      kind: "expense" as const,
    }));

  return {
    nodes: [...accountNodes, ...expenseNodes],
    links: [...linkMap.values()].toSorted(
      (a, b) => b.amountCents - a.amountCents,
    ),
  };
}
