"use client";

import { OpenNewTransactionButton } from "@/features/transactions/components/open-new-transaction-button";

/**
 * Dashboard header CTA — opens the global new-transaction sheet instantly.
 */
export function DashboardNewTransactionButton() {
  return (
    <OpenNewTransactionButton
      className="h-10 w-full rounded-xl sm:w-auto"
      label="Nueva transacción"
      showIcon={false}
    />
  );
}
