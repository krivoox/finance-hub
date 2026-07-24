import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney } from "@/lib/format-money";
import type { AccountWithBalance } from "@/features/accounts/services";

type DashboardAccountsProps = {
  accounts: readonly AccountWithBalance[];
};

/** Right-rail style account list — saldos por cuenta (DTO already loaded). */
export function DashboardAccounts({ accounts }: DashboardAccountsProps) {
  const active = accounts.filter((a) => !a.isArchived).slice(0, 6);

  return (
    <SurfaceSection>
      <SurfaceHeader
        title="Cuentas"
        description="Saldos del espacio"
        action={
          <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
            <Link href="/accounts">Ver todas</Link>
          </Button>
        }
      />

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay cuentas. Configurá el espacio para empezar.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {account.name}
                </p>
                <Badge variant="outline" className="mt-1 h-5 px-1.5 text-[10px]">
                  {account.currency}
                </Badge>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                {formatMoney(
                  account.currentBalance.amountCents,
                  account.currency,
                )}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-4 h-9 w-full rounded-full"
        asChild
      >
        <Link href="/accounts/new">Agregar cuenta</Link>
      </Button>
    </SurfaceSection>
  );
}
