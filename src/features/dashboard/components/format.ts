import { formatMoney, formatSignedMoney } from "@/lib/format-money";
import type { Insight } from "@/features/dashboard/domain";
import type { ListedTransaction } from "@/features/transactions/services";

export function formatPeriodLabel(periodStart: Date, timezone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(periodStart);
}

export function formatOccurredOn(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function amountVariant(type: ListedTransaction["type"]) {
  if (type === "income") return "income" as const;
  if (type === "expense") return "expense" as const;
  return "transfer" as const;
}

export function formatSignedAmount(
  type: ListedTransaction["type"],
  amountCents: number,
  currency: string,
) {
  if (type === "income") return formatSignedMoney(amountCents, currency);
  if (type === "expense") return formatSignedMoney(-amountCents, currency);
  return formatMoney(amountCents, currency);
}

export function formatAccountCell(tx: ListedTransaction) {
  if (tx.type === "transfer" && tx.counterpartyAccountName) {
    return `${tx.accountName} → ${tx.counterpartyAccountName}`;
  }
  return tx.accountName;
}

export function formatInsight(insight: Insight, currency: string): string {
  if (insight.kind === "top_category") {
    return `Mayor gasto del mes: ${insight.categoryName} (${formatMoney(insight.amountCents, currency)}).`;
  }
  if (insight.kind === "category_variation") {
    const sign = insight.variationPercent > 0 ? "+" : "";
    return `En ${insight.categoryName} gastaste ${sign}${insight.variationPercent}% vs el mes anterior.`;
  }
  return `Tenés ${insight.count} presupuesto${insight.count === 1 ? "" : "s"} excedido${insight.count === 1 ? "" : "s"}.`;
}
