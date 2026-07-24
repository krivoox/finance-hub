/**
 * Thin UI helpers for list period labels.
 * Period resolution lives in domain (`resolveListPeriod`).
 */

import type { ListPeriod } from "@/features/transactions/domain";

export function listPeriodDescription(
  period: ListPeriod,
  rangeLabel?: string,
): string {
  switch (period) {
    case "this_week":
      return "Movimientos de la semana";
    case "all":
      return "Todos los movimientos";
    case "custom":
      return rangeLabel
        ? `Movimientos · ${rangeLabel}`
        : "Movimientos del periodo";
    case "this_month":
    default:
      return "Movimientos del mes";
  }
}
