import { Badge } from "@/components/ui/badge";
import { CategoryPill } from "@/features/categories/components/category-pill";
import { cn } from "@/lib/utils";

/** How many named pills before collapsing the rest into +N. */
const DEFAULT_MAX_VISIBLE = 2;

type BudgetCategoryPillsProps = {
  categoryIds: readonly string[];
  /** id → name; includes archived so linked names still resolve. */
  categoryNameById: Readonly<Record<string, string>>;
  maxVisible?: number;
  className?: string;
};

/**
 * Compact category chips for the budgets list.
 * Empty `categoryIds` = all expense categories (SPEC-07) → single "Todas" pill.
 */
export function BudgetCategoryPills({
  categoryIds,
  categoryNameById,
  maxVisible = DEFAULT_MAX_VISIBLE,
  className,
}: BudgetCategoryPillsProps) {
  if (categoryIds.length === 0) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <Badge
          variant="outline"
          title="Todas las categorías de gasto"
          className="font-normal"
        >
          Todas
        </Badge>
      </div>
    );
  }

  const resolved = categoryIds.flatMap((id) => {
    const name = categoryNameById[id];
    return name ? [{ id, name }] : [];
  });

  if (resolved.length === 0) {
    return null;
  }

  const visible = resolved.slice(0, maxVisible);
  const overflow = resolved.slice(maxVisible);
  const overflowTitle = overflow.map((c) => c.name).join(", ");

  return (
    <ul
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Categorías"
    >
      {visible.map((cat) => (
        <li key={cat.id} className="min-w-0">
          <CategoryPill label={cat.name} toneSeed={cat.id} />
        </li>
      ))}
      {overflow.length > 0 ? (
        <li>
          <Badge
            variant="secondary"
            title={overflowTitle}
            className="font-normal tabular-nums"
          >
            +{overflow.length}
          </Badge>
        </li>
      ) : null}
    </ul>
  );
}
