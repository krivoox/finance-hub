import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Emphasized tile (reference “Balance” card) — uses primary ink */
  emphasis?: boolean;
  tone?: "default" | "income" | "expense" | "info";
  className?: string;
  children?: React.ReactNode;
};

/**
 * Ordered KPI tile for dashboard snapshot row.
 * Not decorative fluff: each tile carries a real metric (SPEC-12).
 */
export function KpiTile({
  label,
  value,
  hint,
  emphasis = false,
  tone = "default",
  className,
  children,
}: KpiTileProps) {
  const toneValue =
    tone === "income"
      ? "text-income"
      : tone === "expense"
        ? "text-expense"
        : tone === "info"
          ? "text-info-muted-foreground"
          : emphasis
            ? "text-primary-foreground"
            : "text-foreground";

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border p-4 sm:p-5",
        emphasis
          ? "border-primary bg-primary text-primary-foreground dark:border-transparent dark:shadow-sm"
          : "border-border bg-card dark:border-border/70 dark:shadow-sm",
        className,
      )}
    >
      <p
        className={cn(
          "text-xs font-medium tracking-wide uppercase",
          emphasis ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
          toneValue,
        )}
      >
        {value}
      </p>
      {hint ? (
        <div
          className={cn(
            "mt-1.5 text-xs",
            emphasis
              ? "text-primary-foreground/65"
              : "text-muted-foreground",
          )}
        >
          {hint}
        </div>
      ) : null}
      {children}
    </div>
  );
}
