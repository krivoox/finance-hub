import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Progress fill tones (DESIGN.md).
 * - info / progress / success: healthy goal or ranking bars
 * - caution: budget approaching limit (amber)
 * - alert: ONLY for exceeded / critical (red / expense)
 * - chart-*: relative ranking bars (never alert red)
 */
const fillVariants = cva("h-full rounded-full transition-[width]", {
  variants: {
    tone: {
      info: "bg-info",
      progress: "bg-chart-5",
      success: "bg-success",
      caution: "bg-warning",
      alert: "bg-expense",
      "chart-1": "bg-chart-1",
      "chart-2": "bg-chart-2",
      "chart-3": "bg-chart-3",
    },
  },
  defaultVariants: {
    tone: "info",
  },
});

const trackVariants = cva("w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      sm: "h-1",
      md: "h-1.5",
      lg: "h-2",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type ProgressTone = NonNullable<
  VariantProps<typeof fillVariants>["tone"]
>;

type ProgressBarProps = {
  /** 0–100 (values outside are clamped for width) */
  value: number;
  tone?: ProgressTone;
  size?: VariantProps<typeof trackVariants>["size"];
  className?: string;
  "aria-label"?: string;
};

export function ProgressBar({
  value,
  tone = "info",
  size = "md",
  className,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(trackVariants({ size }), className)}
    >
      <div className={fillVariants({ tone })} style={{ width: `${width}%` }} />
    </div>
  );
}

/** Goal / positive progress toward a target. Red never used here. */
export function goalProgressTone(percent: number): ProgressTone {
  if (percent >= 80) return "success";
  if (percent >= 40) return "progress";
  return "info";
}

/** Budget consumption. Red (`alert`) only when exceeded. */
export function budgetProgressTone(
  status: "on_track" | "warning" | "exceeded",
): ProgressTone {
  if (status === "exceeded") return "alert";
  if (status === "warning") return "caution";
  return "info";
}

/** Relative spending rank bars — chart palette, never expense red. */
export function spendingRankTone(index: number): ProgressTone {
  const tones: ProgressTone[] = ["chart-1", "chart-2", "chart-3"];
  return tones[index % tones.length]!;
}
