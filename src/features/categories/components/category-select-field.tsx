"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CATEGORY_QUICK_PICK_MAX,
  CATEGORY_QUICK_PICK_MIN,
  DEFAULT_CATEGORIES,
  pickFrequentCategories,
  pinSelectedCategory,
  type CategoryKind,
} from "@/features/categories/domain";

import { CategoryPicker, type CategoryOption } from "./category-picker";
import { CategoryQuickPicks } from "./category-quick-picks";

export type CategorySelectOption = CategoryOption & {
  usageCount?: number;
};

type CategorySelectFieldProps = {
  categories: readonly CategorySelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  kind: CategoryKind;
  workspaceId: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

const TILE_MIN_PX = 52;
const TILE_GAP_PX = 8;

function limitForWidth(width: number): number {
  const sixSlots = TILE_MIN_PX * 6 + TILE_GAP_PX * 5;
  return width >= sixSlots ? CATEGORY_QUICK_PICK_MAX : CATEGORY_QUICK_PICK_MIN;
}

export function CategorySelectField({
  categories,
  value,
  onChange,
  kind,
  workspaceId,
  disabled = false,
  id,
  placeholder,
  "aria-invalid": ariaInvalid,
}: CategorySelectFieldProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [limit, setLimit] = useState(CATEGORY_QUICK_PICK_MIN);
  const [created, setCreated] = useState<CategorySelectOption[]>([]);

  useEffect(() => {
    setCreated([]);
  }, [kind]);

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    const apply = (width: number) => {
      setLimit(limitForWidth(width));
    };

    apply(node.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === "number") apply(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const catalog = useMemo(() => {
    const ids = new Set(categories.map((c) => c.id));
    return [...categories, ...created.filter((c) => !ids.has(c.id))];
  }, [categories, created]);

  const usageById = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const category of catalog) {
      usage[category.id] = category.usageCount ?? 0;
    }
    return usage;
  }, [catalog]);

  const seedNames = useMemo(
    () =>
      DEFAULT_CATEGORIES.filter((c) => c.kind === kind).map((c) => c.name),
    [kind],
  );

  const picks = useMemo(() => {
    const frequent = pickFrequentCategories(
      catalog,
      usageById,
      limit,
      seedNames,
    );
    return pinSelectedCategory(frequent, catalog, value, limit);
  }, [catalog, usageById, limit, seedNames, value]);

  return (
    <div ref={rowRef} className="flex flex-col gap-2">
      {catalog.length > 0 ? (
        <CategoryQuickPicks
          categories={picks}
          value={value}
          onChange={(id) => onChange(id)}
          disabled={disabled}
          moreSlot={
            <CategoryPicker
              mode="single"
              id={id}
              categories={catalog}
              value={value}
              onChange={onChange}
              disabled={disabled}
              aria-invalid={ariaInvalid}
              placeholder={placeholder}
              triggerVariant="more-tile"
              allowCreate={{ workspaceId, kind }}
              onCreated={(category) => {
                setCreated((prev) => [
                  ...prev,
                  { id: category.id, name: category.name, usageCount: 0 },
                ]);
              }}
            />
          }
        />
      ) : (
        <CategoryPicker
          mode="single"
          id={id}
          categories={catalog}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          placeholder={placeholder}
          allowCreate={{ workspaceId, kind }}
          onCreated={(category) => {
            setCreated((prev) => [
              ...prev,
              { id: category.id, name: category.name, usageCount: 0 },
            ]);
          }}
        />
      )}
    </div>
  );
}
