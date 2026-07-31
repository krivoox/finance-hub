import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EMPTY_LABEL = "—";

type CategoryPillProps = {
  /** Category name, or special labels like "Transferencia" / "Cambio de moneda". `null` / empty / "—" → muted dash, no badge. */
  label: string | null | undefined;
  className?: string;
};

export function CategoryPill({ label, className }: CategoryPillProps) {
  const trimmed = label?.trim();
  if (!trimmed || trimmed === EMPTY_LABEL) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {EMPTY_LABEL}
      </span>
    );
  }

  return (
    <Badge
      variant="secondary"
      title={trimmed}
      className={cn("max-w-[10rem] truncate font-normal", className)}
    >
      {trimmed}
    </Badge>
  );
}
