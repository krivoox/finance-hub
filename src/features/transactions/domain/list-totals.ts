/**
 * SPEC-05 §4.6 — Aggregate filtered list amounts per currency.
 *
 * Never mixes currencies. Income/expense are cashflow buckets; transfers and
 * fx legs are tracked separately (fx does not count as cashflow / budget spent).
 * KRI-34: presented income / expense / net never include transfers.
 */

import type { ListTypeFilter } from "./list-filters";
import type { TransactionType } from "./types";

export type ListAmountRow = {
  readonly type: TransactionType;
  /** Absolute cents for this row (or pre-summed groupBy total). */
  readonly amountCents: number;
  readonly currency: string;
  /** Tx count contributed by this row. Default 1; use `_count` when folding groupBy. */
  readonly count?: number;
};

export type CurrencyListTotals = {
  readonly currency: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly transferCents: number;
  readonly fxDebitCents: number;
  readonly fxCreditCents: number;
  readonly count: number;
  readonly incomeCount: number;
  readonly expenseCount: number;
  readonly transferCount: number;
  readonly fxCount: number;
};

export type PresentedSumLine = {
  readonly currency: string;
  readonly amountCents: number;
};

export type PresentedBreakdownLine = {
  readonly currency: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
  readonly netCents: number;
};

export type PresentedListTotals =
  | {
      readonly mode: "expense";
      readonly movementCount: number;
      readonly lines: readonly PresentedSumLine[];
    }
  | {
      readonly mode: "income";
      readonly movementCount: number;
      readonly lines: readonly PresentedSumLine[];
    }
  | {
      readonly mode: "transfer";
      readonly movementCount: number;
      readonly lines: readonly PresentedSumLine[];
    }
  | {
      readonly mode: "breakdown";
      readonly movementCount: number;
      readonly byCurrency: readonly PresentedBreakdownLine[];
    };

type MutableBucket = {
  currency: string;
  incomeCents: number;
  expenseCents: number;
  transferCents: number;
  fxDebitCents: number;
  fxCreditCents: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  fxCount: number;
};

function emptyBucket(currency: string): MutableBucket {
  return {
    currency,
    incomeCents: 0,
    expenseCents: 0,
    transferCents: 0,
    fxDebitCents: 0,
    fxCreditCents: 0,
    count: 0,
    incomeCount: 0,
    expenseCount: 0,
    transferCount: 0,
    fxCount: 0,
  };
}

function rowCount(row: ListAmountRow): number {
  return row.count ?? 1;
}

/**
 * Fold rows (individual txs or pre-aggregated groupBy rows) into per-currency
 * buckets. Currencies sorted alphabetically for stable UI.
 */
export function summarizeListAmounts(
  rows: readonly ListAmountRow[],
): CurrencyListTotals[] {
  const map = new Map<string, MutableBucket>();

  for (const row of rows) {
    let bucket = map.get(row.currency);
    if (!bucket) {
      bucket = emptyBucket(row.currency);
      map.set(row.currency, bucket);
    }
    const n = rowCount(row);
    bucket.count += n;
    switch (row.type) {
      case "income":
        bucket.incomeCents += row.amountCents;
        bucket.incomeCount += n;
        break;
      case "expense":
        bucket.expenseCents += row.amountCents;
        bucket.expenseCount += n;
        break;
      case "transfer":
        bucket.transferCents += row.amountCents;
        bucket.transferCount += n;
        break;
      case "fx_debit":
        bucket.fxDebitCents += row.amountCents;
        bucket.fxCount += n;
        break;
      case "fx_credit":
        bucket.fxCreditCents += row.amountCents;
        bucket.fxCount += n;
        break;
      default:
        break;
    }
  }

  return [...map.values()]
    .map((b) => ({ ...b }))
    .toSorted((a, b) => a.currency.localeCompare(b.currency));
}

function sumCounts(
  buckets: readonly CurrencyListTotals[],
  pick: (b: CurrencyListTotals) => number,
): number {
  return buckets.reduce((n, b) => n + pick(b), 0);
}

/**
 * Shape totals for the active type filter so the UI can show a Notion-like
 * SUMA (single mode) or income/expense/net breakdown (type=all).
 *
 * `type=all` is cashflow: transfers and fx never appear as income, expense,
 * net, or movementCount (KRI-34 / SPEC-05 T-20b).
 */
export function presentListTotals(
  buckets: readonly CurrencyListTotals[],
  typeFilter: ListTypeFilter,
): PresentedListTotals {
  switch (typeFilter) {
    case "expense":
      return {
        mode: "expense",
        movementCount: sumCounts(buckets, (b) => b.expenseCount),
        lines: buckets
          .filter((b) => b.expenseCents > 0)
          .map((b) => ({
            currency: b.currency,
            amountCents: b.expenseCents,
          })),
      };
    case "income":
      return {
        mode: "income",
        movementCount: sumCounts(buckets, (b) => b.incomeCount),
        lines: buckets
          .filter((b) => b.incomeCents > 0)
          .map((b) => ({
            currency: b.currency,
            amountCents: b.incomeCents,
          })),
      };
    case "transfer":
      return {
        mode: "transfer",
        movementCount: sumCounts(buckets, (b) => b.transferCount),
        lines: buckets
          .filter((b) => b.transferCents > 0)
          .map((b) => ({
            currency: b.currency,
            amountCents: b.transferCents,
          })),
      };
    case "all":
    default: {
      const byCurrency = buckets
        .filter((b) => b.incomeCents > 0 || b.expenseCents > 0)
        .map((b) => ({
          currency: b.currency,
          incomeCents: b.incomeCents,
          expenseCents: b.expenseCents,
          netCents: b.incomeCents - b.expenseCents,
        }));
      return {
        mode: "breakdown",
        movementCount: sumCounts(
          buckets,
          (b) => b.incomeCount + b.expenseCount,
        ),
        byCurrency,
      };
    }
  }
}
