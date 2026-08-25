"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { useTransactionFeedbackStore } from "@/features/transactions/stores/transaction-feedback-store";

/**
 * Dims money surfaces while a ledger mutation is refreshing. Numbers stay
 * whatever the last RSC payload was — they are not replaced with a client
 * estimate. Opacity + aria-busy is the "updating" state from SPEC-20.
 */
export function MoneyFreshnessFrame({ children }: { children: ReactNode }) {
  const moneyPending = useTransactionFeedbackStore((s) => s.moneyPending);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden",
        moneyPending && "opacity-70 transition-opacity duration-200",
      )}
      aria-busy={moneyPending || undefined}
    >
      {children}
    </div>
  );
}
