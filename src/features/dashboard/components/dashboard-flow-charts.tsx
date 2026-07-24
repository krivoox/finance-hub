"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
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
    <SurfaceSection className="h-full">
      <SurfaceHeader
        title="Flujo del mes"
        description="De qué cuenta salió cada gasto, o ingresos a gastos"
      />

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
            <div className="rounded-xl bg-muted/30 px-1 py-3 sm:px-2">
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
            <div className="rounded-xl bg-muted/30 px-1 py-3 sm:px-2">
              <DashboardCashflowSankey
                data={cashflowSankey}
                currency={currency}
                ariaLabel="Flujo de ingresos a gastos del mes"
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </SurfaceSection>
  );
}
