import type { TransactionType } from "@/features/transactions/domain";

export const TRANSACTION_TYPE_LABEL_ES: Record<TransactionType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  fx_debit: "Cambio",
  fx_credit: "Cambio",
};
