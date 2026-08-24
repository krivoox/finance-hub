import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
  WalletMinimal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import type { AccountWithBalance } from "@/features/accounts/services";
import type { AccountType } from "@/features/accounts/domain";
import { ACCOUNT_TYPE_LABEL_ES } from "@/features/accounts/components/account-type-labels";
import { cn } from "@/lib/utils";

type DashboardAccountsProps = {
  accounts: readonly AccountWithBalance[];
};

const ACCOUNT_ICON: Record<AccountType, typeof Wallet> = {
  checking: Landmark,
  savings: PiggyBank,
  cash: Banknote,
  credit_card: CreditCard,
  virtual_wallet: WalletMinimal,
  other: Wallet,
};

/** Saldos por cuenta (DTO ya cargado). Convención credit card: SPEC-03 §5. */
export function DashboardAccounts({ accounts }: DashboardAccountsProps) {
  const active = accounts.filter((a) => !a.isArchived).slice(0, 6);

  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Cuentas"
        description="Saldos del espacio"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounts">Ver todas</Link>
          </Button>
        }
      />

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground text-pretty">
          Todavía no hay cuentas. Configurá el espacio para empezar.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {active.map((account) => {
            const Icon = ACCOUNT_ICON[account.type];
            const balanceCents = account.currentBalance.amountCents;
            const isCreditDebt =
              account.type === "credit_card" && balanceCents > 0;
            const isNegative = balanceCents < 0;

            return (
              <li
                key={account.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  aria-hidden
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {account.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABEL_ES[account.type]}
                    {isCreditDebt ? " · Deuda" : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {account.currency}
                  </Badge>
                  <p
                    className={cn(
                      "text-sm tabular",
                      isNegative || isCreditDebt
                        ? "text-expense"
                        : "text-foreground",
                    )}
                  >
                    {isCreditDebt ? "− " : ""}
                    {formatMoney(balanceCents, account.currency)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="outline" className="mt-4 w-full" asChild>
        <Link href="/accounts/new">Agregar cuenta</Link>
      </Button>
    </SurfaceSection>
  );
}
