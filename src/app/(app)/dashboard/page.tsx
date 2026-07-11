import Link from "next/link";
import { redirect } from "next/navigation";

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
import { getSession } from "@/lib/session";
import { getCurrentUser } from "@/features/auth/services/get-current-user";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { getDashboard, getAnalytics } from "@/features/dashboard/services";
import type { ListedTransaction } from "@/features/transactions/services";
import type { Insight } from "@/features/dashboard/domain";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [profile, workspace] = await Promise.all([
    getCurrentUser(),
    getActiveWorkspaceForUser(session.user.id),
  ]);

  if (!workspace) {
    return (
      <ContentPanel
        title="Dashboard"
        description="Todavía no tenés un workspace activo."
      >
        <p className="text-sm text-muted-foreground">
          Creá un workspace para empezar a ver tu resumen financiero.
        </p>
      </ContentPanel>
    );
  }

  const timezone = profile?.timezone ?? "UTC";
  const [dashboard, analytics] = await Promise.all([
    getDashboard({
      userId: session.user.id,
      workspaceId: workspace.id,
      timezone,
      currency: workspace.baseCurrency,
    }),
    getAnalytics({
      userId: session.user.id,
      workspaceId: workspace.id,
      timezone,
    }),
  ]);

  const currency = dashboard.currency;
  const periodLabel = formatPeriodLabel(dashboard.period.start, timezone);

  return (
    <ContentPanel
      title="Dashboard"
      description={`${workspace.name} · ${periodLabel}`}
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
              {formatMoney(dashboard.totalBalance.amountCents, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ingresos del mes
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-income">
              {formatMoney(dashboard.monthlyCashflow.incomeCents, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Gastos del mes
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-expense">
              {formatMoney(dashboard.monthlyCashflow.expenseCents, currency)}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Presupuestos en riesgo
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/budgets">Ver todos</Link>
              </Button>
            </div>
            {dashboard.budgetsAtRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ningún presupuesto en warning o exceeded.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.budgetsAtRisk.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatMoney(b.spentCents, currency)} /{" "}
                        {formatMoney(b.limitCents, currency)}
                      </p>
                    </div>
                    <Badge
                      variant={b.status === "exceeded" ? "expense" : "secondary"}
                    >
                      {b.status === "exceeded" ? "Excedido" : "Alerta"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Objetivos activos
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/goals">Ver todos</Link>
              </Button>
            </div>
            {dashboard.goalsProgress.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay objetivos activos.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {dashboard.goalsProgress.map((g) => (
                  <li key={g.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{g.name}</p>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {g.progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, g.progressPercent)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {dashboard.memberBalances ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Balances del grupo
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/groups">Ver grupo</Link>
              </Button>
            </div>
            <ul className="divide-y divide-border">
              {dashboard.memberBalances.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <p className="font-medium text-foreground">
                    {m.displayName ?? m.userId}
                  </p>
                  <Badge
                    variant={m.netCents >= 0 ? "income" : "expense"}
                    className="tabular-nums"
                  >
                    {m.netCents >= 0 ? "Le deben " : "Debe "}
                    {formatMoney(Math.abs(m.netCents), currency)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Insights
          </h2>
          {analytics.insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay suficientes datos para insights.
            </p>
          ) : (
            <ul className="space-y-2">
              {analytics.insights.map((insight, i) => (
                <li
                  key={`${insight.kind}-${i}`}
                  className="text-sm text-foreground"
                >
                  {formatInsight(insight, currency)}
                </li>
              ))}
            </ul>
          )}
          {analytics.spendingByCategory.length > 0 ? (
            <ul className="mt-4 divide-y divide-border">
              {analytics.spendingByCategory.slice(0, 5).map((row) => (
                <li
                  key={row.categoryId}
                  className="flex items-center justify-between gap-3 py-2 text-sm first:pt-0"
                >
                  <span className="text-muted-foreground">
                    {row.categoryName}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatMoney(row.amountCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
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
          {dashboard.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no registraste movimientos en este workspace.
            </p>
          ) : (
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
                {dashboard.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {tx.description ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tx.categoryName ?? "Sin categoría"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatAccountCell(tx)}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
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
        </div>
      </div>
    </ContentPanel>
  );
}

function amountVariant(type: ListedTransaction["type"]) {
  if (type === "income") return "income" as const;
  if (type === "expense") return "expense" as const;
  return "transfer" as const;
}

function formatSignedAmount(
  type: ListedTransaction["type"],
  amountCents: number,
  currency: string,
) {
  if (type === "income") return formatSignedMoney(amountCents, currency);
  if (type === "expense") return formatSignedMoney(-amountCents, currency);
  return formatMoney(amountCents, currency);
}

function formatAccountCell(tx: ListedTransaction) {
  if (tx.type === "transfer" && tx.counterpartyAccountName) {
    return `${tx.accountName} → ${tx.counterpartyAccountName}`;
  }
  return tx.accountName;
}

function formatOccurredOn(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatPeriodLabel(periodStart: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(periodStart);
}

function formatInsight(insight: Insight, currency: string): string {
  if (insight.kind === "top_category") {
    return `Mayor gasto del mes: ${insight.categoryName} (${formatMoney(insight.amountCents, currency)}).`;
  }
  if (insight.kind === "category_variation") {
    const sign = insight.variationPercent > 0 ? "+" : "";
    return `En ${insight.categoryName} gastaste ${sign}${insight.variationPercent}% vs el mes anterior.`;
  }
  return `Tenés ${insight.count} presupuesto${insight.count === 1 ? "" : "s"} excedido${insight.count === 1 ? "" : "s"}.`;
}
