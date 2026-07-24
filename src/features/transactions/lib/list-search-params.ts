/**
 * URL contract for `/transactions` list filters + pagination (SPEC-05 FR-04).
 *
 * Params: `period`, `from`, `to`, `type`, `accountId`, `categoryId`, `cursor`.
 * `new` is owned by create FormSheet and must be preserved when rewriting qs.
 *
 * Period/type normalization mirrors domain (`normalizeListPeriod` /
 * `normalizeListTypeFilter`). Custom range UX validation is UI-only;
 * domain throws `InvalidDateRangeError` when resolving.
 */

import {
  LIST_PAGE_SIZE,
  LIST_PERIODS,
  LIST_TYPE_FILTERS,
  inclusiveDaySpan,
  isIsoCalendarDay,
  isListPeriod,
  isListTypeFilter,
  normalizeListPeriod,
  normalizeListTypeFilter,
  type ListPeriod,
  type ListTypeFilter,
} from "@/features/transactions/domain";

export {
  LIST_PAGE_SIZE,
  LIST_PERIODS,
  LIST_TYPE_FILTERS,
  inclusiveDaySpan,
  isIsoCalendarDay as isIsoDay,
};
export type { ListPeriod, ListTypeFilter };

/** @deprecated Prefer LIST_PAGE_SIZE — kept for existing UI imports. */
export const PAGE_SIZE = LIST_PAGE_SIZE;
export const MAX_CUSTOM_RANGE_DAYS = 366;

export type TransactionListParams = {
  period: ListPeriod;
  from?: string;
  to?: string;
  type: ListTypeFilter;
  accountId?: string;
  categoryId?: string;
  /** Cursor of the last item of the previous page (SPEC-05 §4.5). */
  cursor?: string;
};

export type TransactionListQueryInput = {
  period?: ListPeriod;
  from?: string | null;
  to?: string | null;
  type?: ListTypeFilter;
  accountId?: string | null;
  categoryId?: string | null;
  cursor?: string | null;
  /** Preserve create-sheet deep link. */
  new?: string | null;
};

function first(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseTransactionListSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): TransactionListParams {
  const periodRaw = first(searchParams.period);
  const fromRaw = first(searchParams.from);
  const toRaw = first(searchParams.to);
  const typeRaw = first(searchParams.type);
  const accountId = first(searchParams.accountId);
  const categoryId = first(searchParams.categoryId);
  const cursor = first(searchParams.cursor);

  let period = normalizeListPeriod(periodRaw);

  const from = fromRaw && isIsoCalendarDay(fromRaw) ? fromRaw : undefined;
  const to = toRaw && isIsoCalendarDay(toRaw) ? toRaw : undefined;

  // Incomplete custom in URL → soft fallback to default (domain would throw).
  if (period === "custom" && (!from || !to)) {
    period = "this_month";
  }

  const type = normalizeListTypeFilter(typeRaw);

  return {
    period,
    from: period === "custom" ? from : undefined,
    to: period === "custom" ? to : undefined,
    type,
    accountId: accountId || undefined,
    categoryId: categoryId || undefined,
    cursor: cursor || undefined,
  };
}

/** UX validation for the custom range sheet (not domain). */
export function validateCustomRange(
  from: string,
  to: string,
): string | null {
  if (!isIsoCalendarDay(from) || !isIsoCalendarDay(to)) {
    return "Elegí fechas válidas.";
  }
  if (from > to) {
    return "La fecha desde no puede ser posterior a hasta.";
  }
  if (inclusiveDaySpan(from, to) > MAX_CUSTOM_RANGE_DAYS) {
    return `El rango no puede superar ${MAX_CUSTOM_RANGE_DAYS} días.`;
  }
  return null;
}

export function formatRangeChipLabel(
  from: string,
  to: string,
  locale: string = "es-AR",
): string {
  const fmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const fromLabel = fmt.format(new Date(Date.UTC(fy, fm - 1, fd)));
  const toLabel = fmt.format(new Date(Date.UTC(ty, tm - 1, td)));
  if (from === to) return fromLabel;
  return `${fromLabel} – ${toLabel}`;
}

export function hasNonPeriodFilters(params: TransactionListParams): boolean {
  return (
    params.type !== "all" ||
    Boolean(params.accountId) ||
    Boolean(params.categoryId)
  );
}

export function buildTransactionListQuery(
  input: TransactionListQueryInput,
): string {
  const qs = new URLSearchParams();

  const period = input.period ?? "this_month";
  if (period !== "this_month") {
    qs.set("period", period);
  }

  if (period === "custom") {
    if (input.from) qs.set("from", input.from);
    if (input.to) qs.set("to", input.to);
  }

  if (input.type && input.type !== "all") {
    qs.set("type", input.type);
  }
  if (input.accountId) qs.set("accountId", input.accountId);
  if (input.categoryId) qs.set("categoryId", input.categoryId);

  if (input.cursor) qs.set("cursor", input.cursor);

  if (input.new) qs.set("new", input.new);

  return qs.toString();
}

export function transactionListHref(input: TransactionListQueryInput): string {
  const qs = buildTransactionListQuery(input);
  return qs ? `/transactions?${qs}` : "/transactions";
}

/** Merge patch onto current params; resets cursor when filters change. */
export function patchTransactionListParams(
  current: TransactionListParams,
  patch: Partial<TransactionListQueryInput>,
  options?: { resetPaging?: boolean },
): TransactionListQueryInput {
  const resetPaging = options?.resetPaging ?? true;
  const next: TransactionListQueryInput = {
    period: patch.period ?? current.period,
    from:
      patch.from === null
        ? undefined
        : (patch.from ?? current.from),
    to: patch.to === null ? undefined : (patch.to ?? current.to),
    type: patch.type ?? current.type,
    accountId:
      patch.accountId === null
        ? undefined
        : (patch.accountId ?? current.accountId),
    categoryId:
      patch.categoryId === null
        ? undefined
        : (patch.categoryId ?? current.categoryId),
    cursor: resetPaging ? undefined : (patch.cursor ?? current.cursor),
    new: patch.new === null ? undefined : patch.new,
  };

  if (next.period !== "custom") {
    next.from = undefined;
    next.to = undefined;
  }

  return next;
}

/** @internal re-export helpers used by tests / tooling */
export { isListPeriod, isListTypeFilter };
