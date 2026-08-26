"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { CheckIcon, ChevronDownIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createCategoryAction } from "@/features/categories/actions";
import {
  categoryCreateSuggestion,
  composeCategoryName,
  type CategoryKind,
} from "@/features/categories/domain";
import { invalidateNewTransactionFormOptions } from "@/features/transactions/stores/new-transaction-form-options-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  CategoryEmojiGrid,
  DEFAULT_CREATE_EMOJI,
} from "./category-emoji-picker";
import { CategoryMoreTileTrigger } from "./category-quick-picks";

export type CategoryOption = {
  id: string;
  name: string;
};

type CategoryPickerBase = {
  categories: readonly CategoryOption[];
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

type CategoryPickerMultiProps = CategoryPickerBase & {
  mode: "multi";
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** Shown when nothing is selected (means “all expense categories”). */
  emptyLabel?: string;
};

type CategoryPickerSingleProps = CategoryPickerBase & {
  mode: "single";
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  /** In-place create from the search query (income/expense forms). */
  allowCreate?: {
    workspaceId: string;
    kind: CategoryKind;
  };
  onCreated?: (category: { id: string; name: string }) => void;
  /** `more-tile` is the last cell of the frequent-category row. */
  triggerVariant?: "select" | "more-tile";
};

export type CategoryPickerProps =
  | CategoryPickerMultiProps
  | CategoryPickerSingleProps;

const DEFAULT_MULTI_EMPTY = "Todas las categorías";
const DEFAULT_SINGLE_PLACEHOLDER = "Elegir categoría";

function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function filterCategories(
  categories: readonly CategoryOption[],
  query: string,
): CategoryOption[] {
  const q = normalizeQuery(query);
  if (!q) return [...categories];
  return categories.filter((c) => normalizeQuery(c.name).includes(q));
}

function MultiTriggerSummary({
  value,
  categories,
  emptyLabel,
}: {
  value: readonly string[];
  categories: readonly CategoryOption[];
  emptyLabel: string;
}) {
  if (value.length === 0) {
    return (
      <span className="truncate text-muted-foreground">{emptyLabel}</span>
    );
  }

  const byId = new Map(categories.map((c) => [c.id, c.name]));
  const names = value
    .map((id) => byId.get(id))
    .filter((n): n is string => Boolean(n));

  if (names.length === 0) {
    return (
      <span className="truncate text-muted-foreground">{emptyLabel}</span>
    );
  }

  if (names.length <= 2) {
    return (
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {names.map((name) => (
          <Badge
            key={name}
            variant="secondary"
            className="max-w-[8rem] truncate font-normal"
          >
            {name}
          </Badge>
        ))}
      </span>
    );
  }

  return (
    <span className="truncate tabular-nums">
      {names.length} categorías
    </span>
  );
}

type PanelProps = {
  mode: "multi" | "single";
  filtered: readonly CategoryOption[];
  allNames: readonly string[];
  selectedIds: ReadonlySet<string>;
  query: string;
  onQueryChange: (q: string) => void;
  searchId: string;
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  allowCreate?: {
    workspaceId: string;
    kind: CategoryKind;
  };
  onCreated?: (category: { id: string; name: string }) => void;
};

function CategoryPickerPanel({
  mode,
  filtered,
  allNames,
  selectedIds,
  query,
  onQueryChange,
  searchId,
  onToggle,
  onClear,
  onClose,
  allowCreate,
  onCreated,
}: PanelProps) {
  const hasSelection = selectedIds.size > 0;
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emoji, setEmoji] = useState<string>(
    allowCreate ? DEFAULT_CREATE_EMOJI[allowCreate.kind] : DEFAULT_CREATE_EMOJI.expense,
  );
  const [emojiOverride, setEmojiOverride] = useState<string | null>(null);
  const [isCreating, startCreate] = useTransition();

  const suggestion =
    mode === "single" && allowCreate
      ? categoryCreateSuggestion(query, allNames)
      : null;

  const createEmoji = emojiOverride ?? suggestion?.emoji ?? emoji;

  function handleCreate() {
    if (!allowCreate || !suggestion) return;
    const name = composeCategoryName(createEmoji, suggestion.label);
    startCreate(async () => {
      const result = await createCategoryAction({
        workspaceId: allowCreate.workspaceId,
        name,
        kind: allowCreate.kind,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      invalidateNewTransactionFormOptions(allowCreate.workspaceId);
      onCreated?.({ id: result.data.id, name: result.data.name });
      onToggle(result.data.id);
      onClose();
    });
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Buscar categoría
        </label>
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => {
            setEmojiOverride(null);
            onQueryChange(e.target.value);
          }}
          placeholder={allowCreate ? "Buscar o crear…" : "Buscar…"}
          autoComplete="off"
          autoFocus={false}
          className="h-10 pl-8 sm:h-9"
        />
      </div>

      {mode === "multi" && hasSelection ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {selectedIds.size} seleccionada
            {selectedIds.size === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-8 gap-1 text-muted-foreground sm:h-7"
            onClick={onClear}
          >
            <XIcon className="size-3.5" aria-hidden />
            Limpiar
          </Button>
        </div>
      ) : null}

      <ul
        role="listbox"
        aria-multiselectable={mode === "multi" ? true : undefined}
        className="flex max-h-[min(16rem,50dvh)] min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain"
      >
        {filtered.length === 0 && !suggestion ? (
          <li className="px-2 py-6 text-center text-sm text-muted-foreground">
            Sin resultados
          </li>
        ) : (
          filtered.map((category) => {
            const selected = selectedIds.has(category.id);
            if (mode === "multi") {
              return (
                <li key={category.id} role="option" aria-selected={selected}>
                  <label
                    className={cn(
                      "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-foreground transition-colors",
                      "hover:bg-muted/80 has-focus-visible:bg-muted/80",
                      selected && "bg-muted/60",
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => onToggle(category.id)}
                      aria-label={category.name}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {category.name}
                    </span>
                  </label>
                </li>
              );
            }

            return (
              <li key={category.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex min-h-10 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    "hover:bg-muted/80 focus-visible:bg-muted/80 focus-visible:outline-none",
                    selected
                      ? "bg-muted/60 font-medium text-foreground"
                      : "text-foreground",
                  )}
                  onClick={() => {
                    onToggle(category.id);
                    onClose();
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {category.name}
                  </span>
                  {selected ? (
                    <CheckIcon
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>

      {suggestion ? (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          {emojiOpen ? (
            <CategoryEmojiGrid
              value={createEmoji}
              onChange={(next) => {
                setEmoji(next);
                setEmojiOverride(next);
                setEmojiOpen(false);
              }}
            />
          ) : null}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Elegir emoji"
              aria-expanded={emojiOpen}
              disabled={isCreating}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-lg",
                "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                "sm:size-9",
              )}
              onClick={() => setEmojiOpen((open) => !open)}
            >
              <span aria-hidden>{createEmoji}</span>
            </button>
            <button
              type="button"
              disabled={isCreating}
              className={cn(
                "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                "hover:bg-muted/80 focus-visible:bg-muted/80 focus-visible:outline-none sm:min-h-9",
              )}
              onClick={handleCreate}
            >
              <PlusIcon className="size-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 truncate">
                {isCreating ? "Creando…" : `Crear «${suggestion.label}»`}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function preventSearchAutofocus(event: Event) {
  event.preventDefault();
}

export function CategoryPicker(props: CategoryPickerProps) {
  const {
    categories,
    disabled = false,
    id,
    className,
    "aria-invalid": ariaInvalid,
  } = props;

  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const reactId = useId();
  const searchId = `${id ?? reactId}-search`;
  const triggerVariant =
    props.mode === "single" ? (props.triggerVariant ?? "select") : "select";
  const allowCreate = props.mode === "single" ? props.allowCreate : undefined;
  const onCreated = props.mode === "single" ? props.onCreated : undefined;

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  const filtered = useMemo(
    () => filterCategories(sorted, query),
    [sorted, query],
  );

  const allNames = useMemo(() => sorted.map((c) => c.name), [sorted]);

  const selectedIds = useMemo(() => {
    if (props.mode === "multi") {
      return new Set(props.value);
    }
    return props.value ? new Set([props.value]) : new Set<string>();
  }, [props]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  function handleToggle(categoryId: string) {
    if (props.mode === "multi") {
      const next = props.value.includes(categoryId)
        ? props.value.filter((id) => id !== categoryId)
        : [...props.value, categoryId];
      props.onChange(next);
      return;
    }
    props.onChange(categoryId);
  }

  function handleClear() {
    if (props.mode === "multi") {
      props.onChange([]);
    } else {
      props.onChange(null);
    }
  }

  const emptyLabel =
    props.mode === "multi"
      ? (props.emptyLabel ?? DEFAULT_MULTI_EMPTY)
      : undefined;
  const placeholder =
    props.mode === "single"
      ? (props.placeholder ?? DEFAULT_SINGLE_PLACEHOLDER)
      : undefined;

  const selectedName =
    props.mode === "single" && props.value
      ? (sorted.find((c) => c.id === props.value)?.name ?? null)
      : null;

  const triggerLabel =
    props.mode === "multi" ? (
      <MultiTriggerSummary
        value={props.value}
        categories={sorted}
        emptyLabel={emptyLabel!}
      />
    ) : selectedName ? (
      <span className="truncate">{selectedName}</span>
    ) : (
      <span className="truncate text-muted-foreground">{placeholder}</span>
    );

  const panel = (
    <CategoryPickerPanel
      mode={props.mode}
      filtered={filtered}
      allNames={allNames}
      selectedIds={selectedIds}
      query={query}
      onQueryChange={setQuery}
      searchId={searchId}
      onToggle={handleToggle}
      onClear={handleClear}
      onClose={() => handleOpenChange(false)}
      allowCreate={allowCreate}
      onCreated={onCreated}
    />
  );

  const trigger =
    triggerVariant === "more-tile" ? (
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Más categorías"
        className={cn(
          "min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
          "disabled:pointer-events-none disabled:opacity-50",
          "active:scale-[0.97] motion-reduce:active:scale-100",
          className,
        )}
        onClick={() => {
          if (isMobile) handleOpenChange(true);
        }}
      >
        <CategoryMoreTileTrigger
          disabled={disabled}
          expanded={open}
        />
      </button>
    ) : (
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          nativeSelectClassName,
          "items-center justify-between gap-2 text-left font-normal",
          "h-auto min-h-10 py-2 sm:min-h-9",
          className,
        )}
        onClick={() => {
          if (isMobile) handleOpenChange(true);
        }}
      >
        <span className="flex min-w-0 flex-1 items-center">{triggerLabel}</span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
    );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetContent
            side="bottom"
            className="gap-0 rounded-t-xl p-0"
            showCloseButton
            onOpenAutoFocus={preventSearchAutofocus}
          >
            <SheetHeader className="border-b border-border px-4 pt-4 pb-3">
              <SheetTitle>
                {props.mode === "multi"
                  ? "Categorías del presupuesto"
                  : "Elegir categoría"}
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {panel}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "p-3",
          triggerVariant === "more-tile"
            ? "w-80 min-w-72"
            : "w-[var(--radix-popover-trigger-width)] min-w-64",
        )}
        onOpenAutoFocus={preventSearchAutofocus}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}
