"use client";

import { formatMoney } from "@/lib/format-money";
import type { AccountType } from "@/features/accounts/domain";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";
import { cn } from "@/lib/utils";

export type LedgerPreviewAccount = {
  id: string;
  name: string;
  type: AccountType;
  balanceCents: number;
};

export type LedgerPreviewExpense = {
  id: string;
  description: string;
  amountCents: number;
  categoryName: string;
};

type LedgerPreviewProps = {
  currency: string;
  workspaceName: string;
  accounts: LedgerPreviewAccount[];
  expense: LedgerPreviewExpense | null;
  className?: string;
  /** Soft panel inside the onboarding modal (no outer card chrome). */
  variant?: "card" | "embedded";
};

function netWorthCents(accounts: LedgerPreviewAccount[]): number {
  let total = 0;
  for (const account of accounts) {
    if (account.type === "credit_card") {
      total -= account.balanceCents;
    } else {
      total += account.balanceCents;
    }
  }
  return total;
}

export function LedgerPreview({
  currency,
  workspaceName,
  accounts,
  expense,
  className,
  variant = "card",
}: LedgerPreviewProps) {
  const patrimonio = netWorthCents(accounts);
  const embedded = variant === "embedded";

  return (
    <aside
      className={cn(
        embedded
          ? "flex h-full flex-col p-5 sm:p-6"
          : "rounded-xl border border-border bg-card p-4 sm:p-5",
        className,
      )}
      aria-live="polite"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Vista previa · {workspaceName}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Patrimonio</p>
      <p
        className={cn(
          "mt-0.5 font-semibold tabular-nums tracking-tight text-foreground motion-safe:transition-opacity motion-safe:duration-200",
          embedded ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
          accounts.length === 0 && "text-muted-foreground",
        )}
      >
        {accounts.length === 0 ? "—" : formatMoney(patrimonio, currency)}
      </p>

      <div
        className={cn(
          "mt-5 space-y-2.5 border-t border-border/80 pt-4",
          embedded && "flex-1",
        )}
      >
        {accounts.length === 0 ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sin cuentas aún — van a aparecer acá.
          </p>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-baseline justify-between gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {account.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ACCOUNT_TYPE_LABEL_ES[account.type]}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm tabular-nums",
                  account.type === "credit_card"
                    ? "text-expense"
                    : "text-foreground",
                )}
              >
                {account.type === "credit_card" && account.balanceCents > 0
                  ? `− ${formatMoney(account.balanceCents, currency)}`
                  : formatMoney(account.balanceCents, currency)}
              </p>
            </div>
          ))
        )}
      </div>

      {expense ? (
        <div className="mt-4 border-t border-border/80 pt-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <p className="text-xs text-muted-foreground">Último movimiento</p>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {expense.description || expense.categoryName}
              </p>
              <p className="text-xs text-muted-foreground">
                {expense.categoryName}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-expense">
              − {formatMoney(expense.amountCents, currency)}
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
