/**
 * SPEC-12 §4 / T-02 — Monthly cashflow.
 *
 *   incomeCents  = Σ amountCents where type = "income"  and occurredOn ∈ [start, end)
 *   expenseCents = Σ amountCents where type = "expense" and occurredOn ∈ [start, end)
 *   netCents     = incomeCents − expenseCents
 *
 * Transfers are excluded on purpose: they move money between accounts of the
 * same workspace and do not change the workspace's income or expense.
 *
 * `[start, end)` is a half-open interval so the caller can pass the 1st of
 * the current month and the 1st of the next month without double-counting.
 */

import type { DashboardTransaction, MonthlyCashflow } from "./types";

export function computeMonthlyCashflow(
  transactions: readonly DashboardTransaction[],
  periodStart: Date,
  periodEnd: Date,
  currency: string,
): MonthlyCashflow {
  const startMs = periodStart.getTime();
  const endMs = periodEnd.getTime();

  let incomeCents = 0;
  let expenseCents = 0;

  for (const tx of transactions) {
    if (tx.currency !== currency) continue;
    const t = tx.occurredOn.getTime();
    if (t < startMs || t >= endMs) continue;

    if (tx.type === "income") {
      incomeCents += tx.amountCents;
    } else if (tx.type === "expense") {
      expenseCents += tx.amountCents;
    }
  }

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    currency,
  };
}
