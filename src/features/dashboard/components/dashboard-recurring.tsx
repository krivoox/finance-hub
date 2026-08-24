import Link from "next/link";
import { Repeat } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SurfaceHeader,
  SurfaceSection,
} from "@/components/surface-section";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import type { UpcomingRecurringItem } from "@/features/recurring/services";
import { cn } from "@/lib/utils";

type DashboardRecurringProps = {
  items: readonly UpcomingRecurringItem[];
};

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "short",
  timeZone: "UTC",
});

function scheduledParts(scheduledOn: string) {
  const date = new Date(`${scheduledOn.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return { day: "—", month: "" };
  return {
    day: String(date.getUTCDate()),
    month: monthFormatter.format(date).replace(".", ""),
  };
}

function amountLabel(item: UpcomingRecurringItem) {
  if (item.ruleType === "income") {
    return formatSignedMoney(item.amountCents, item.currency);
  }
  if (item.ruleType === "expense") {
    return formatSignedMoney(-item.amountCents, item.currency);
  }
  return formatMoney(item.amountCents, item.currency);
}

function amountTone(item: UpcomingRecurringItem) {
  if (item.ruleType === "income") return "text-income";
  if (item.ruleType === "expense") return "text-expense";
  return "text-foreground";
}

/**
 * Preview read-only de próximas recurrentes (SPEC-18 §5.2 / SPEC-12 FR-08).
 * Chip de fecha a la izquierda para leer el calendario del mes de un vistazo;
 * no materializa nada — eso se confirma en `/transactions/recurring`.
 */
export function DashboardRecurring({ items }: DashboardRecurringProps) {
  const visible = items.slice(0, 6);

  return (
    <SurfaceSection className="flex h-full flex-col">
      <SurfaceHeader
        title="Próximas recurrentes"
        description={
          items.length === 0
            ? "Próximos 30 días"
            : `${items.length} ocurrencia${items.length === 1 ? "" : "s"} en los próximos 30 días`
        }
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/transactions/recurring">Ver todas</Link>
          </Button>
        }
      />

      {visible.length === 0 ? (
        <div className="flex items-start gap-3">
          <Repeat
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <p className="text-sm text-muted-foreground text-pretty">
            No hay recurrentes por venir en los próximos 30 días.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {visible.map((item) => {
            const { day, month } = scheduledParts(item.scheduledOn);
            const isToday = item.status === "pending_today";

            return (
              <li
                key={`${item.ruleId}:${item.scheduledOn}`}
                className="flex items-center gap-3 rounded-xl bg-background/60 px-2.5 py-2 dark:bg-background/40"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 flex-col items-center justify-center rounded-lg leading-none",
                    isToday
                      ? "bg-info-muted text-info-muted-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {day}
                  </span>
                  <span className="mt-0.5 text-[10px] uppercase">
                    {isToday ? "hoy" : month}
                  </span>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.ruleName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.categoryName ?? item.accountName}
                  </span>
                </span>

                <span
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    amountTone(item),
                  )}
                >
                  {amountLabel(item)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SurfaceSection>
  );
}
