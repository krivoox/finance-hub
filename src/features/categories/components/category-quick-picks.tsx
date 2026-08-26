"use client";

import type { ReactNode } from "react";
import { EllipsisIcon } from "lucide-react";

import {
  categoryPillTone,
  splitLeadingEmoji,
  type CategoryPillTone,
} from "@/features/categories/domain";
import { cn } from "@/lib/utils";

const TILE_TONE: Record<CategoryPillTone, string> = {
  "chart-1": "border-chart-1/45 bg-chart-1/10 text-chart-1",
  "chart-2": "border-chart-2/45 bg-chart-2/10 text-chart-2",
  "chart-3": "border-chart-3/45 bg-chart-3/10 text-chart-3",
  "chart-4": "border-chart-4/45 bg-chart-4/10 text-chart-4",
  "chart-5": "border-chart-5/45 bg-chart-5/10 text-chart-5",
};

const TILE_TONE_SELECTED: Record<CategoryPillTone, string> = {
  "chart-1": "border-chart-1 bg-chart-1/20 text-chart-1 ring-2 ring-chart-1/35",
  "chart-2": "border-chart-2 bg-chart-2/20 text-chart-2 ring-2 ring-chart-2/35",
  "chart-3": "border-chart-3 bg-chart-3/20 text-chart-3 ring-2 ring-chart-3/35",
  "chart-4": "border-chart-4 bg-chart-4/20 text-chart-4 ring-2 ring-chart-4/35",
  "chart-5": "border-chart-5 bg-chart-5/20 text-chart-5 ring-2 ring-chart-5/35",
};

export type QuickPickCategory = {
  id: string;
  name: string;
};

type CategoryQuickPicksProps = {
  categories: readonly QuickPickCategory[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  moreSlot: ReactNode;
};

export function CategoryQuickPicks({
  categories,
  value,
  onChange,
  disabled = false,
  moreSlot,
}: CategoryQuickPicksProps) {
  const columns = categories.length + 1;

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      <div role="radiogroup" aria-label="Categorías frecuentes" className="contents">
        {categories.map((category) => {
          const selected = category.id === value;
          const { emoji, label } = splitLeadingEmoji(category.name);
          const tone = categoryPillTone(category.id);
          const glyph = emoji ?? label.slice(0, 1).toUpperCase();

          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              title={category.name}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg p-0.5",
                "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
                "active:scale-[0.97] motion-reduce:active:scale-100",
              )}
              onClick={() => onChange(category.id)}
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl border text-lg leading-none",
                  selected ? TILE_TONE_SELECTED[tone] : TILE_TONE[tone],
                )}
                aria-hidden
              >
                {glyph}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] leading-tight font-medium",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {moreSlot}
    </div>
  );
}

type MoreTileTriggerProps = {
  disabled?: boolean;
  expanded?: boolean;
};

export function CategoryMoreTileTrigger({
  disabled,
  expanded,
}: MoreTileTriggerProps) {
  return (
    <span
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 rounded-lg p-0.5",
        disabled && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground",
          expanded && "border-ring bg-muted",
        )}
        aria-hidden
      >
        <EllipsisIcon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="w-full truncate text-center text-[10px] leading-tight font-medium text-muted-foreground">
        Más
      </span>
    </span>
  );
}
