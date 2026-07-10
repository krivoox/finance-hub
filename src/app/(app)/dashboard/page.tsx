import Link from "next/link";

import { ContentPanel } from "@/components/app-shell/content-panel";
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
import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import { mockDashboard } from "@/mocks/dashboard";

function amountVariant(type: "income" | "expense" | "transfer") {
  if (type === "income") return "income" as const;
  if (type === "expense") return "expense" as const;
  return "transfer" as const;
}

export default function DashboardPage() {
  // TODO: replace with GetDashboard use case
  const data = mockDashboard;

  return (
    <ContentPanel
      title="Dashboard"
      description={`${data.workspaceName} · ${data.cashflow.periodLabel}`}
      actions={
        <Button asChild>
          <Link href="/transactions">Nuevo movimiento</Link>
        </Button>
      }
    >
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Patrimonio
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground">
              {formatMoney(data.totalBalanceCents, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ingresos del mes
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-income">
              {formatMoney(data.cashflow.incomeCents, data.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Gastos del mes
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-expense">
              {formatMoney(data.cashflow.expenseCents, data.currency)}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Presupuestos en riesgo
            </h2>
            {data.budgetsAtRisk.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Ninguno por ahora.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.budgetsAtRisk.map((budget) => (
                  <li
                    key={budget.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {budget.name}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatMoney(budget.spentCents)} /{" "}
                        {formatMoney(budget.limitCents)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        budget.status === "exceeded" ? "expense" : "warning"
                      }
                    >
                      {budget.status === "exceeded" ? "Excedido" : "Al límite"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Objetivos activos
            </h2>
            <ul className="mt-3 space-y-3">
              {data.goals.map((goal) => {
                const pct = Math.round(
                  (goal.currentCents / goal.targetCents) * 100
                );
                return (
                  <li key={goal.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {goal.name}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {pct}%
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-info"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Movimientos recientes
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/transactions">Ver todos</Link>
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {tx.description}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {tx.categoryName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.accountName}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {tx.date}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={amountVariant(tx.type)} className="tabular-nums">
                      {formatSignedMoney(tx.amountCents, data.currency)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ContentPanel>
  );
}
