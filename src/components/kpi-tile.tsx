import { cn } from "@/lib/utils";

type KpiTileProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** Emphasized tile — uses primary (blue) fill */
  emphasis?: boolean;
  tone?: "default" | "income" | "expense" | "transfer" | "info";
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
        : tone === "transfer"
          ? "text-transfer"
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
                ? "border-transparent bg-cta text-primary-foreground shadow-card"
                : "border-border bg-card shadow-card",
            ),
        className,
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold tracking-widest uppercase",
          emphasis ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-heading font-extrabold tracking-tight tabular",
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
