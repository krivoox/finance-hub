import "server-only";
import {
  createIncomeOrExpense,
  type CreateIncomeServiceInput,
} from "./create-income";
import type { TransactionRecord } from "./require-transaction-membership";

export type CreateExpenseServiceInput = CreateIncomeServiceInput;

/**
 * SPEC-05 T-01 / FR-01 — Persist an expense for the caller's workspace.
 */
export async function createExpense(
  input: CreateExpenseServiceInput,
): Promise<TransactionRecord> {
  return createIncomeOrExpense("expense", input);
}
