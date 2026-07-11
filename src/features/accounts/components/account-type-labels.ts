import type { AccountType } from "@/features/accounts/domain";

export const ACCOUNT_TYPE_LABEL_ES: Record<AccountType, string> = {
  checking: "Cuenta corriente",
  savings: "Caja de ahorro",
  cash: "Efectivo",
  credit_card: "Tarjeta de crédito",
  virtual_wallet: "Billetera virtual",
  other: "Otra",
};
