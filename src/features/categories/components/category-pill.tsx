import { Badge } from "@/components/ui/badge";
import {
  categoryPillTone,
  type CategoryPillTone,
} from "@/features/categories/domain/category-pill-tone";
import { splitLeadingEmoji } from "@/features/categories/domain/split-leading-emoji";
import { cn } from "@/lib/utils";

const EMPTY_LABEL = "—";
const TRANSFER_LABEL = "Transferencia";
const FX_LABEL = "Cambio de moneda";

const CHART_TONE_BADGE: Record<CategoryPillTone, string> = {
  "chart-1": "border-transparent bg-chart-1/15 text-chart-1",
  "chart-2": "border-transparent bg-chart-2/15 text-chart-2",
  "chart-3": "border-transparent bg-chart-3/15 text-chart-3",
  "chart-4": "border-transparent bg-chart-4/15 text-chart-4",
  "chart-5": "border-transparent bg-chart-5/15 text-chart-5",
};

const CHART_TONE_TEXT: Record<CategoryPillTone, string> = {
  "chart-1": "text-chart-1",
  "chart-2": "text-chart-2",
  "chart-3": "text-chart-3",
  "chart-4": "text-chart-4",
  "chart-5": "text-chart-5",
};

type CategoryPillProps = {
  /** Category name, or special labels like "Transferencia" / "Cambio de moneda". `null` / empty / "—" → muted dash, no badge. */
  label: string | null | undefined;
  /** Prefer category id so renames keep the same tone. Falls back to label. */
  toneSeed?: string | null;
  className?: string;
  /** `text` = colored label without pill (ledger table). */
  variant?: "badge" | "text";
};

export function CategoryPill({
  label,
  toneSeed,
  className,
  variant = "badge",
}: CategoryPillProps) {
  const trimmed = label?.trim();
  if (!trimmed || trimmed === EMPTY_LABEL) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {EMPTY_LABEL}
      </span>
    );
  }

  const { label: displayLabel } = splitLeadingEmoji(trimmed);
  const isSpecial = trimmed === TRANSFER_LABEL || trimmed === FX_LABEL;

  if (variant === "text") {
    if (isSpecial) {
      return (
        <span
          title={trimmed}
          className={cn("font-medium text-transfer", className)}
        >
          {displayLabel}
        </span>
      );
    }
    const seed = toneSeed?.trim() || trimmed;
    const tone = categoryPillTone(seed);
    return (
      <span
        title={trimmed}
        className={cn("font-medium", CHART_TONE_TEXT[tone], className)}
      >
        {displayLabel}
      </span>
    );
  }

  if (isSpecial) {
    return (
      <Badge
        variant="transfer"
        title={trimmed}
        className={cn("max-w-[10rem] truncate font-normal", className)}
      >
        {trimmed}
      </Badge>
    );
  }

  const seed = toneSeed?.trim() || trimmed;
  const tone = categoryPillTone(seed);

  return (
    <Badge
      variant="secondary"
      title={trimmed}
      className={cn(
        "max-w-[10rem] truncate font-normal",
        CHART_TONE_BADGE[tone],
        className,
      )}
    >
      {trimmed}
    </Badge>
  );
}
