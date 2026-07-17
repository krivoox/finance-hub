"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CashflowSankey } from "@/features/dashboard/domain";

import { DashboardCashflowSankey } from "./dashboard-cashflow-sankey";

type DashboardFlowChartsProps = {
  currency: string;
  cashflowSankey: CashflowSankey;
  accountSankey: CashflowSankey;
};

export function DashboardFlowCharts({
  currency,
  cashflowSankey,
  accountSankey,
}: DashboardFlowChartsProps) {
  const hasCashflow = cashflowSankey.nodes.length > 0;
  const hasAccounts = accountSankey.nodes.length > 0;

  if (!hasCashflow && !hasAccounts) return null;

  const defaultTab = hasAccounts ? "accounts" : "cashflow";

  return (
    <section
      aria-label="Flujo del mes"
      className="flex flex-col gap-4 border-t border-border pt-6 sm:pt-8"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">Flujo del mes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          De qué cuenta salió cada gasto, o ingresos a gastos
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="gap-3">
        <TabsList variant="line" className="w-full justify-start sm:w-auto">
          {hasAccounts ? (
            <TabsTrigger value="accounts">Cuentas → gastos</TabsTrigger>
          ) : null}
          {hasCashflow ? (
            <TabsTrigger value="cashflow">Ingresos → gastos</TabsTrigger>
          ) : null}
        </TabsList>

        {hasAccounts ? (
          <TabsContent value="accounts" className="mt-0">
            <div className="rounded-xl border border-border bg-muted/30 px-2 py-4 sm:px-4">
              <DashboardCashflowSankey
                data={accountSankey}
                currency={currency}
                ariaLabel="Gastos del mes por cuenta y categoría"
              />
            </div>
          </TabsContent>
        ) : null}

        {hasCashflow ? (
          <TabsContent value="cashflow" className="mt-0">
            <div className="rounded-xl border border-border bg-muted/30 px-2 py-4 sm:px-4">
              <DashboardCashflowSankey
                data={cashflowSankey}
                currency={currency}
                ariaLabel="Flujo de ingresos a gastos del mes"
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </section>
  );
}
