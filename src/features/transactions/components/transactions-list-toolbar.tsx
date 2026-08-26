"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, X } from "lucide-react";

import {
  FormActions,
  FormField,
  FormSheet,
  FormSheetBody,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { DateField } from "@/components/date-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import { cn } from "@/lib/utils";

import {
  formatRangeChipLabel,
  patchTransactionListParams,
  transactionListHref,
  validateCustomRange,
  type ListPeriod,
  type ListTypeFilter,
  type TransactionListParams,
} from "../lib/list-search-params";

type Option = { id: string; name: string };

type TransactionsListToolbarProps = {
  params: TransactionListParams;
  accounts: readonly Option[];
  categories: readonly Option[];
};

const PERIOD_PRESETS: { value: Exclude<ListPeriod, "custom">; label: string }[] =
  [
    { value: "this_month", label: "Este mes" },
    { value: "this_week", label: "Esta semana" },
    { value: "all", label: "Todo" },
  ];

const TYPE_OPTIONS: { value: ListTypeFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "income", label: "Ingreso" },
  { value: "expense", label: "Gasto" },
  { value: "transfer", label: "Transfer." },
];

function chipClass(active: boolean) {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-3.5 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );
}

export function TransactionsListToolbar({
  params,
  accounts,
  categories,
}: TransactionsListToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [draftFrom, setDraftFrom] = useState(params.from ?? "");
  const [draftTo, setDraftTo] = useState(params.to ?? "");
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [draftType, setDraftType] = useState<ListTypeFilter>(params.type);
  const [draftAccountId, setDraftAccountId] = useState(params.accountId ?? "");
  const [draftCategoryId, setDraftCategoryId] = useState(
    params.categoryId ?? "",
  );

  const newParam = searchParams.get("new");

  const accountName = useMemo(
    () => accounts.find((a) => a.id === params.accountId)?.name,
    [accounts, params.accountId],
  );
  const categoryName = useMemo(
    () => categories.find((c) => c.id === params.categoryId)?.name,
    [categories, params.categoryId],
  );

  const customLabel =
    params.period === "custom" && params.from && params.to
      ? formatRangeChipLabel(params.from, params.to)
      : null;

  const denseFilterCount =
    (params.type !== "all" ? 1 : 0) +
    (params.accountId ? 1 : 0) +
    (params.categoryId ? 1 : 0) +
    (customLabel ? 1 : 0);

  const hasActiveChips = denseFilterCount > 0;

  function navigate(
    patch: Parameters<typeof patchTransactionListParams>[1],
    options?: { resetPaging?: boolean },
  ) {
    const next = patchTransactionListParams(
      params,
      {
        ...patch,
        new: newParam,
      },
      options,
    );
    const href = transactionListHref(next);
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function openFiltersSheet() {
    setDraftType(params.type);
    setDraftAccountId(params.accountId ?? "");
    setDraftCategoryId(params.categoryId ?? "");
    setDraftFrom(params.period === "custom" ? (params.from ?? "") : "");
    setDraftTo(params.period === "custom" ? (params.to ?? "") : "");
    setRangeError(null);
    setFiltersOpen(true);
  }

  function applyFilters() {
    const hasFrom = Boolean(draftFrom);
    const hasTo = Boolean(draftTo);

    if (hasFrom || hasTo) {
      const error = validateCustomRange(draftFrom, draftTo);
      if (error) {
        setRangeError(error);
        return;
      }
      setRangeError(null);
      setFiltersOpen(false);
      navigate({
        period: "custom",
        from: draftFrom,
        to: draftTo,
        type: draftType,
        accountId: draftAccountId || null,
        categoryId: draftCategoryId || null,
      });
      return;
    }

    setRangeError(null);
    setFiltersOpen(false);
    navigate({
      period: params.period === "custom" ? "this_month" : params.period,
      from: null,
      to: null,
      type: draftType,
      accountId: draftAccountId || null,
      categoryId: draftCategoryId || null,
    });
  }

  function clearFilters() {
    setDraftType("all");
    setDraftAccountId("");
    setDraftCategoryId("");
    setDraftFrom("");
    setDraftTo("");
    setRangeError(null);
    setFiltersOpen(false);
    navigate({
      period: "this_month",
      from: null,
      to: null,
      type: "all",
      accountId: null,
      categoryId: null,
    });
  }

  const typeLabel =
    params.type === "all"
      ? null
      : TYPE_OPTIONS.find((o) => o.value === params.type)?.label;

  return (
    <div
      className={cn("mb-5 flex flex-col gap-3", pending && "opacity-80")}
    >
      {/* Period rail — horizontal scroll on narrow viewports */}
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PERIOD_PRESETS.map((preset) => {
          const active = params.period === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              aria-pressed={active}
              disabled={pending}
              className={chipClass(active)}
              onClick={() =>
                navigate({
                  period: preset.value,
                  from: null,
                  to: null,
                })
              }
            >
              {preset.label}
            </button>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="ml-auto h-9 shrink-0 gap-1.5 rounded-xl px-3"
          disabled={pending}
          onClick={openFiltersSheet}
        >
          Filtros
          {denseFilterCount > 0 ? (
            <Badge variant="info" className="h-5 min-w-5 px-1.5">
              {denseFilterCount}
            </Badge>
          ) : null}
          <ChevronDown className="size-3.5" aria-hidden />
        </Button>
      </div>

      {/* Active filter chips */}
      {hasActiveChips ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {customLabel ? (
            <FilterChip
              label={`Fechas · ${customLabel}`}
              onClear={() =>
                navigate({
                  period: "this_month",
                  from: null,
                  to: null,
                })
              }
              disabled={pending}
            />
          ) : null}
          {typeLabel ? (
            <FilterChip
              label={`Tipo · ${typeLabel}`}
              onClear={() => navigate({ type: "all" })}
              disabled={pending}
            />
          ) : null}
          {accountName ? (
            <FilterChip
              label={`Cuenta · ${accountName}`}
              onClear={() => navigate({ accountId: null })}
              disabled={pending}
            />
          ) : null}
          {categoryName ? (
            <FilterChip
              label={`Categoría · ${categoryName}`}
              onClear={() => navigate({ categoryId: null })}
              disabled={pending}
            />
          ) : null}
        </div>
      ) : null}

      <FormSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtros"
        description="Periodo personalizado, tipo, cuenta y categoría (AND)."
        size="md"
        layout="fill"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <FormSheetBody>
            <FormStack>
              <FormField label="Desde" htmlFor="tx-filter-from" optional>
                <DateField
                  id="tx-filter-from"
                  triggerClassName=""
                  clearable
                  placeholder="Sin límite"
                  value={draftFrom}
                  invalid={Boolean(rangeError)}
                  max={draftTo || undefined}
                  onChange={(next) => {
                    setDraftFrom(next);
                    setRangeError(null);
                  }}
                />
              </FormField>
              <FormField
                label="Hasta"
                htmlFor="tx-filter-to"
                optional
                error={rangeError ?? undefined}
              >
                <DateField
                  id="tx-filter-to"
                  triggerClassName=""
                  clearable
                  placeholder="Sin límite"
                  value={draftTo}
                  invalid={Boolean(rangeError)}
                  min={draftFrom || undefined}
                  onChange={(next) => {
                    setDraftTo(next);
                    setRangeError(null);
                  }}
                />
              </FormField>

              <FormField label="Tipo" htmlFor="tx-filter-type">
                <SegmentedControl
                  id="tx-filter-type"
                  ariaLabel="Tipo de movimiento"
                  value={draftType}
                  options={TYPE_OPTIONS}
                  onChange={setDraftType}
                />
              </FormField>

              <FormField label="Cuenta" htmlFor="tx-filter-account" optional>
                <select
                  id="tx-filter-account"
                  className={nativeSelectClassName}
                  value={draftAccountId}
                  onChange={(e) => setDraftAccountId(e.target.value)}
                >
                  <option value="">Todas</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Categoría" htmlFor="tx-filter-category" optional>
                <CategoryPicker
                  mode="single"
                  id="tx-filter-category"
                  categories={categories}
                  value={draftCategoryId || null}
                  onChange={(id) => setDraftCategoryId(id ?? "")}
                  placeholder="Todas"
                />
              </FormField>
            </FormStack>
          </FormSheetBody>
          <FormActions sticky>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={clearFilters}
            >
              Limpiar
            </Button>
            <Button type="button" className="w-full" onClick={applyFilters}>
              Aplicar
            </Button>
          </FormActions>
        </div>
      </FormSheet>
    </div>
  );
}

function FilterChip({
  label,
  onClear,
  disabled,
}: {
  label: string;
  onClear: () => void;
  disabled?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className="h-7 gap-1 rounded-full border-border pr-1 font-normal"
    >
      <span className="max-w-[12rem] truncate pl-0.5">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Quitar filtro ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        onClick={onClear}
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
