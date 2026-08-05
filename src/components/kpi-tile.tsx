import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Emphasized tile (reference “Balance” card) — uses primary ink */
  emphasis?: boolean;
  tone?: "default" | "income" | "expense" | "info";
  /**
   * `surface` = standalone tile with its own chrome.
   * `plain` = stat inside an existing surface (no border/fill, no card-in-card).
   */
  variant?: "surface" | "plain";
  size?: "md" | "sm";
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
  variant = "surface",
  size = "md",
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

  const isPlain = variant === "plain";

  return (
    <div
      className={cn(
        "flex flex-col",
        isPlain
          ? "gap-0.5"
          : cn(
              "rounded-2xl border p-4 sm:p-5",
              emphasis
                ? "border-primary bg-primary text-primary-foreground dark:border-transparent dark:shadow-sm"
                : "border-border bg-muted/35 dark:border-transparent dark:bg-secondary dark:shadow-sm",
            ),
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
          "font-semibold tracking-tight tabular-nums",
          size === "sm" ? "text-base sm:text-lg" : "text-xl sm:text-2xl",
          isPlain ? "mt-0.5" : "mt-2",
          toneValue,
        )}
      >
        {value}
      </p>
      {hint ? (
        <div
          className={cn(
            "mt-1.5 text-xs",
            emphasis ? "text-primary-foreground/65" : "text-muted-foreground",
          )}
        >
          {hint}
        </div>
      ) : null}
      {children}
    </div>
  );
}
