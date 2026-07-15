import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ListedTransaction } from "@/features/transactions/services";

import {
  amountVariant,
  formatAccountCell,
  formatOccurredOn,
  formatSignedAmount,
} from "./format";

type DashboardRecentProps = {
  currency: string;
  transactions: readonly ListedTransaction[];
};

export function DashboardRecent({
  currency,
  transactions,
}: DashboardRecentProps) {
  return (
    <section aria-label="Movimientos recientes" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Movimientos recientes
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Última actividad del workspace
          </p>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href="/transactions">Ver todos</Link>
        </Button>
      </div>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no registraste movimientos en este workspace.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="relative">
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                    >
                      {tx.description ?? "—"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {tx.categoryName ?? "Sin categoría"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatAccountCell(tx)}
                </TableCell>
                <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                  {formatOccurredOn(tx.occurredOn)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={amountVariant(tx.type)}
                    className="tabular-nums"
                  >
                    {formatSignedAmount(tx.type, tx.amountCents, currency)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
