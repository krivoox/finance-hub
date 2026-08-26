import { cn } from "@/lib/utils";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";

export function SplitNetAmount({
  cents,
  currency,
  className,
}: {
  cents: number;
  currency: string;
  className?: string;
}) {
  const tone =
    cents > 0
      ? "text-income"
      : cents < 0
        ? "text-expense"
        : "text-muted-foreground";

  return (
    <span className={cn("tabular", tone, className)}>
      {cents === 0
        ? formatMoney(0, currency)
        : formatSignedMoney(cents, currency)}
    </span>
  );
}
