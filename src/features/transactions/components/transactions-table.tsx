import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSignedMoney } from "@/lib/format-money";
import type { TransactionType } from "@/features/transactions/domain";

type TableTransaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: Date | string;
  description: string | null;
  categoryName: string | null;
  accountName: string;
  accountWorkspaceId: string;
  counterpartyAccountName: string | null;
  createdByDisplayName: string;
  isExternalToWorkspace: boolean;
  registrationWorkspaceName: string | null;
};

function amountVariant(
  type: TransactionType,
): "income" | "expense" | "transfer" {
  if (type === "fx_credit" || type === "income") return "income";
  if (type === "fx_debit" || type === "expense") return "expense";
  return "transfer";
}

function signedAmountCents(
  type: TransactionType,
  amountCents: number,
): number {
  if (type === "income" || type === "fx_credit") return amountCents;
  if (type === "expense" || type === "fx_debit") return -amountCents;
  return -amountCents;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatOccurredOn(date: Date | string): string {
  const d = asDate(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type TransactionsTableProps = {
  items: readonly TableTransaction[];
  workspaceId: string;
};

export function TransactionsTable({
  items,
  workspaceId,
}: TransactionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Descripción</TableHead>
          <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
          <TableHead className="hidden md:table-cell">Categoría</TableHead>
          <TableHead className="hidden lg:table-cell">Registró</TableHead>
          <TableHead className="hidden sm:table-cell">Fecha</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((tx) => {
          const accountLabel =
            tx.type === "transfer" && tx.counterpartyAccountName
              ? `${tx.accountName} → ${tx.counterpartyAccountName}`
              : tx.isExternalToWorkspace && tx.registrationWorkspaceName
                ? `${tx.registrationWorkspaceName} · ${tx.accountName}`
                : tx.accountName;
          const categoryLabel =
            tx.type === "transfer"
              ? "Transferencia"
              : tx.type === "fx_debit" || tx.type === "fx_credit"
                ? "Cambio de moneda"
                : (tx.categoryName ?? "—");
          const description =
            tx.description ??
            (tx.type === "transfer"
              ? "Transferencia"
              : tx.type === "fx_debit" || tx.type === "fx_credit"
                ? "Cambio de moneda"
                : (tx.categoryName ?? "Movimiento"));
          const descriptionWithChip = tx.isExternalToWorkspace
            ? `${tx.registrationWorkspaceName ?? "Otro espacio"} · ${description}`
            : description;

          return (
            <TableRow key={tx.id} className="relative">
              <TableCell>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="font-medium text-foreground after:absolute after:inset-0 hover:underline"
                  >
                    {descriptionWithChip}
                  </Link>
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {accountLabel}
                    {" · "}
                    {formatOccurredOn(tx.occurredOn)}
                  </span>
                  {tx.accountWorkspaceId !== workspaceId &&
                  !tx.isExternalToWorkspace ? (
                    <span className="text-xs text-muted-foreground">
                      Pagado desde otro espacio
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">
                {accountLabel}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {categoryLabel}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {tx.createdByDisplayName}
              </TableCell>
              <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                {formatOccurredOn(tx.occurredOn)}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={amountVariant(tx.type)}
                  className="tabular-nums"
                >
                  {formatSignedMoney(
                    signedAmountCents(tx.type, tx.amountCents),
                    tx.currency,
                  )}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
