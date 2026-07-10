import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-money";

// TODO: replace with ListBudgets use case — delete inline mock
const mockBudgets = [
  {
    id: "b1",
    name: "Comida",
    spentCents: 92_000_00,
    limitCents: 100_000_00,
    status: "warning" as const,
  },
  {
    id: "b2",
    name: "Transporte",
    spentCents: 28_000_00,
    limitCents: 50_000_00,
    status: "ok" as const,
  },
  {
    id: "b3",
    name: "Ocio",
    spentCents: 45_000_00,
    limitCents: 40_000_00,
    status: "exceeded" as const,
  },
];

export default function BudgetsPage() {
  return (
    <ContentPanel
      title="Presupuestos"
      description="Límites del mes en curso."
      actions={<Button>Nuevo presupuesto</Button>}
    >
      <ul className="divide-y divide-border">
        {mockBudgets.map((budget) => {
          const pct = Math.round((budget.spentCents / budget.limitCents) * 100);
          return (
            <li
              key={budget.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{budget.name}</p>
                  {budget.status === "warning" ? (
                    <Badge variant="warning">Al límite</Badge>
                  ) : null}
                  {budget.status === "exceeded" ? (
                    <Badge variant="expense">Excedido</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatMoney(budget.spentCents)} de{" "}
                  {formatMoney(budget.limitCents)}
                </p>
                <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      budget.status === "exceeded"
                        ? "h-full rounded-full bg-expense"
                        : budget.status === "warning"
                          ? "h-full rounded-full bg-warning"
                          : "h-full rounded-full bg-info"
                    }
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
              <p className="text-sm tabular-nums text-muted-foreground">
                {pct}%
              </p>
            </li>
          );
        })}
      </ul>
    </ContentPanel>
  );
}
