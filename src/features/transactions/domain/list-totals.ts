/**
 * SPEC-05 §4.6 — Aggregate filtered list amounts per currency.
 *
 * Never mixes currencies. Income/expense are cashflow buckets; transfers and
 * fx legs are tracked separately (fx does not count as cashflow / budget spent).
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
};

export type PresentedSumLine = {
  readonly currency: string;
  readonly amountCents: number;
};

export type PresentedBreakdownLine = {
  readonly currency: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
};

export type PresentedListTotals =
  | { readonly mode: "expense"; readonly lines: readonly PresentedSumLine[] }
  | { readonly mode: "income"; readonly lines: readonly PresentedSumLine[] }
  | { readonly mode: "transfer"; readonly lines: readonly PresentedSumLine[] }
  | {
      readonly mode: "breakdown";
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
  };
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
    bucket.count += row.count ?? 1;
    switch (row.type) {
      case "income":
        bucket.incomeCents += row.amountCents;
        break;
      case "expense":
        bucket.expenseCents += row.amountCents;
        break;
      case "transfer":
        bucket.transferCents += row.amountCents;
        break;
      case "fx_debit":
        bucket.fxDebitCents += row.amountCents;
        break;
      case "fx_credit":
        bucket.fxCreditCents += row.amountCents;
        break;
      default:
        break;
    }
  }

  return [...map.values()]
    .map((b) => ({ ...b }))
    .toSorted((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * Shape totals for the active type filter so the UI can show a Notion-like
 * SUMA (single mode) or income/expense breakdown (type=all).
 */
export function presentListTotals(
  buckets: readonly CurrencyListTotals[],
  typeFilter: ListTypeFilter,
): PresentedListTotals {
  switch (typeFilter) {
    case "expense":
      return {
        mode: "expense",
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
        }));
      if (byCurrency.length > 0) {
        return { mode: "breakdown", byCurrency };
      }
      // Filtered set may be only transfers (e.g. type=all + account) — still show SUMA.
      const transferLines = buckets
        .filter((b) => b.transferCents > 0)
        .map((b) => ({
          currency: b.currency,
          amountCents: b.transferCents,
        }));
      if (transferLines.length > 0) {
        return { mode: "transfer", lines: transferLines };
      }
      return { mode: "breakdown", byCurrency: [] };
    }
  }
}
