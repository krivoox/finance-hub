import { ContentPanel } from "@/components/app-shell/content-panel";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-money";

// TODO: replace with ListGoals use case — delete inline mock
const mockGoals = [
  {
    id: "g1",
    name: "Fondo de emergencia",
    currentCents: 420_000_00,
    targetCents: 1_000_000_00,
  },
  {
    id: "g2",
    name: "Viaje",
    currentCents: 180_000_00,
    targetCents: 600_000_00,
  },
];

export default function GoalsPage() {
  return (
    <ContentPanel
      title="Objetivos"
      description="Ahorro con meta y progreso."
      actions={<Button>Nuevo objetivo</Button>}
    >
      <ul className="space-y-6">
        {mockGoals.map((goal) => {
          const pct = Math.round((goal.currentCents / goal.targetCents) * 100);
          return (
            <li key={goal.id}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-medium text-foreground">{goal.name}</h2>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {pct}%
                </p>
              </div>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {formatMoney(goal.currentCents)} /{" "}
                {formatMoney(goal.targetCents)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-info"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </ContentPanel>
  );
}
