import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import type { ListedTransaction } from "@/features/transactions/services";
import { cn } from "@/lib/utils";

import { amountVariant, formatShortDate, formatSignedAmount } from "./format";

type DashboardRecentProps = {
  transactions: readonly ListedTransaction[];
  /** Max rows in the list (mobile Panel uses a shorter glance). */
  limit?: number;
};

const TYPE_CHROME = {
  income: {
    icon: ArrowDownLeft,
    badge: "bg-income-muted text-income",
    amount: "text-income",
  },
  expense: {
    icon: ArrowUpRight,
    badge: "bg-expense-muted text-expense",
    amount: "text-expense",
  },
  transfer: {
    icon: ArrowLeftRight,
    badge: "bg-transfer-muted text-transfer",
    amount: "text-foreground",
  },
} as const;

/**
 * Actividad reciente en formato lista (rail del Panel): identidad + categoría
 * a la izquierda, monto firmado a la derecha. Sin tabla: en el rail y en
 * móvil las columnas secundarias no aportan.
 */
export function DashboardRecent({
  transactions,
  limit = 6,
}: DashboardRecentProps) {
  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Actividad reciente"
        description="Últimos movimientos del workspace"
        action={
          <Button variant="ghost" size="sm" className="h-8 rounded-full" asChild>
            <Link href="/transactions">Ver todo</Link>
          </Button>
        }
      />

      {transactions.length === 0 ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-3 py-2">
          <p className="text-sm text-muted-foreground text-pretty">
            Todavía no registraste movimientos en este workspace.
          </p>
          <Button variant="outline" size="sm" className="h-9 rounded-full" asChild>
            <Link href="/transactions/new">Registrar el primero</Link>
          </Button>
        </div>
      ) : (
        <ul className="-mx-2 divide-y divide-border">
          {transactions.slice(0, limit).map((tx) => {
            const chrome = TYPE_CHROME[amountVariant(tx.type)];
            const Icon = chrome.icon;

            return (
              <li key={tx.id} className="relative">
                <Link
                  href={`/transactions/${tx.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:bg-background/40"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      chrome.badge,
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" strokeWidth={2} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {tx.description ?? "Sin descripción"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tx.categoryName ?? "Sin categoría"} ·{" "}
                      {formatShortDate(tx.occurredOn)}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      chrome.amount,
                    )}
                  >
                    {formatSignedAmount(tx.type, tx.amountCents, tx.currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceSection>
  );
}
