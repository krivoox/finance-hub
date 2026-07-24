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
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
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
    <SurfaceSection flush>
      <div className="border-b border-border px-4 pt-4 sm:px-5 sm:pt-5">
        <SurfaceHeader
          title="Movimientos recientes"
          description="Última actividad del workspace"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full"
              asChild
            >
              <Link href="/transactions">Ver todos</Link>
            </Button>
          }
          className="mb-4"
        />
      </div>

      {transactions.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
          Todavía no registraste movimientos en este workspace.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4 sm:pl-5">Descripción</TableHead>
              <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
              <TableHead className="hidden md:table-cell">Fecha</TableHead>
              <TableHead className="pr-4 text-right sm:pr-5">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="relative">
                <TableCell className="pl-4 sm:pl-5">
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
                <TableCell className="pr-4 text-right sm:pr-5">
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
    </SurfaceSection>
  );
}
