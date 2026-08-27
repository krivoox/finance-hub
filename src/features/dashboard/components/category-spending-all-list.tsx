"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { splitLeadingEmoji } from "@/features/categories/domain/split-leading-emoji";
import {
  hiddenCategoryRows,
  OTHER_CATEGORY_ID,
  rankedSpendingRows,
  type CategoryShare,
  type SpendingByCategoryRow,
} from "@/features/dashboard/domain";
import { formatMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";

type CategorySpendingAllListProps = {
  currency: string;
  rows: readonly SpendingByCategoryRow[];
  slices: readonly CategoryShare[];
  /**
   * `disclosure` — list only when expanded (donut / barra compacta).
   * `replace` — list always visible; expanded swaps Otras for the full ranking
   * (card móvil).
   */
  variant?: "disclosure" | "replace";
};

type ListItem = {
  categoryId: string;
  categoryName: string;
  amountCents: number;
  percent: number;
  transactionCount: number;
};

function movLabel(count: number): string {
  if (count === 1) return "1 mov.";
  return `${count} mov.`;
}

function countFor(
  categoryId: string,
  rows: readonly SpendingByCategoryRow[],
  keptIds: ReadonlySet<string>,
): number {
  if (categoryId === OTHER_CATEGORY_ID) {
    return rows
      .filter((row) => !keptIds.has(row.categoryId))
      .reduce((sum, row) => sum + (row.transactionCount ?? 0), 0);
  }
  return rows.find((row) => row.categoryId === categoryId)?.transactionCount ?? 0;
}

/**
 * Expand/collapse the real category ranking behind the synthetic "Otras"
 * slice. Glance (donut / short legend) stays compact.
 */
export function CategorySpendingAllList({
  currency,
  rows,
  slices,
  variant = "disclosure",
}: CategorySpendingAllListProps) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const hidden = hiddenCategoryRows(rows, slices);
  const hasTail = hidden.length > 0;

  if (!hasTail && variant === "disclosure") {
    return null;
  }

  const keptIds = new Set(
    slices
      .filter((slice) => slice.categoryId !== OTHER_CATEGORY_ID)
      .map((slice) => slice.categoryId),
  );

  const ranked = rankedSpendingRows(rows);
  const totalCents = ranked.reduce((sum, row) => sum + row.amountCents, 0);

  const items: ListItem[] =
    variant === "replace" && !(expanded && hasTail)
      ? slices.map((slice) => ({
          categoryId: slice.categoryId,
          categoryName: slice.categoryName,
          amountCents: slice.amountCents,
          percent: slice.percent,
          transactionCount: countFor(slice.categoryId, rows, keptIds),
        }))
      : ranked.map((row) => ({
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          amountCents: row.amountCents,
          percent:
            totalCents > 0
              ? Math.round((row.amountCents / totalCents) * 1000) / 10
              : 0,
          transactionCount: row.transactionCount ?? 0,
        }));

  const listHidden = variant === "disclosure" && !expanded;
  const showList = variant === "replace" || hasTail;
  const button = hasTail ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-10 w-full min-h-10 font-semibold text-primary"
      aria-expanded={expanded}
      aria-controls={listId}
      onClick={() => setExpanded((current) => !current)}
    >
      {expanded ? "Mostrar menos" : "Ver todas las categorías"}
      <ChevronDown
        data-icon="inline-end"
        className={cn(
          "motion-safe:transition-transform motion-safe:duration-200",
          expanded && "rotate-180",
        )}
      />
    </Button>
  ) : null;

  const list = showList ? (
    <ul
      id={listId}
      className={cn(
        "flex flex-col gap-1",
        listHidden && "hidden",
        variant === "disclosure" && "border-t border-border pt-3",
      )}
    >
      {items.map((item) => {
        const { emoji, label } = splitLeadingEmoji(item.categoryName);
        const rowKey =
          variant === "disclosure"
            ? `all-${item.categoryId}`
            : `row-${item.categoryId}`;

        return (
          <li key={rowKey} className="flex items-center gap-3 py-2">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base"
              aria-hidden
            >
              {emoji ?? "·"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">
                {label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {item.percent}%
                {item.transactionCount > 0
                  ? ` · ${movLabel(item.transactionCount)}`
                  : ""}
              </span>
            </span>
            <span className="tabular shrink-0 text-sm text-expense">
              {formatMoney(item.amountCents, currency)}
            </span>
          </li>
        );
      })}
    </ul>
  ) : null;

  if (variant === "replace") {
    return (
      <div className="flex flex-col">
        {list}
        {button ? (
          <div className="border-t border-border pt-1">{button}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {button}
      {list}
    </div>
  );
}
