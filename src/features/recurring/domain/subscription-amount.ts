/**
 * Subscription platform templates — amount math (SPEC-18 delta).
 *
 * Tax markup is expressed in **basis points** (bps):
 * - 2300 = 23%
 * - 0 = taxes off
 *
 * List price may be ARS or USD cents. The returned `amountCents` is in the
 * **account currency** (ready for `createRecurringRule`).
 */

import type { AccountCurrency } from "@/domain/money/currencies";
import { categoryNameKey } from "@/features/categories/domain";
import {
  CONSOLIDATION_RATE_SCALE,
  convertArsUsdCents,
} from "@/features/dashboard/domain/consolidation";

export const DEFAULT_TAX_MARKUP_BPS = 2300;

export class SubscriptionAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionAmountError";
  }
}

export type SubscriptionListBreakdown = {
  readonly currency: AccountCurrency;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
};

/** @deprecated Use computeSubscriptionListBreakdown */
export type SubscriptionUsdBreakdown = Omit<SubscriptionListBreakdown, "currency">;

/**
 * Apply tax markup to a list price in its own currency.
 */
export function computeSubscriptionListBreakdown(input: {
  listPriceCents: number;
  listCurrency: AccountCurrency;
  taxMarkupBps: number;
}): SubscriptionListBreakdown {
  const { listPriceCents, listCurrency, taxMarkupBps } = input;

  if (!Number.isInteger(listPriceCents) || listPriceCents <= 0) {
    throw new SubscriptionAmountError(
      "El precio lista debe ser un entero de centavos > 0",
    );
  }
  if (!Number.isInteger(taxMarkupBps) || taxMarkupBps < 0) {
    throw new SubscriptionAmountError(
      "El markup debe ser un entero de basis points ≥ 0",
    );
  }

  const totalCents = Math.round(
    (listPriceCents * (10_000 + taxMarkupBps)) / 10_000,
  );
  const taxCents = totalCents - listPriceCents;

  return {
    currency: listCurrency,
    subtotalCents: listPriceCents,
    taxCents,
    totalCents,
  };
}

/** Back-compat wrapper (USD lista). */
export function computeSubscriptionUsdBreakdown(input: {
  listPriceUsdCents: number;
  taxMarkupBps: number;
}): SubscriptionUsdBreakdown {
  const r = computeSubscriptionListBreakdown({
    listPriceCents: input.listPriceUsdCents,
    listCurrency: "USD",
    taxMarkupBps: input.taxMarkupBps,
  });
  return {
    subtotalCents: r.subtotalCents,
    taxCents: r.taxCents,
    totalCents: r.totalCents,
  };
}

/**
 * Lista × (1 + markup) → cents in `accountCurrency`.
 * FX only when list currency ≠ account currency.
 */
export function computeSubscriptionAmountCents(input: {
  listPriceCents?: number;
  listCurrency?: AccountCurrency;
  /** @deprecated Prefer listPriceCents + listCurrency */
  listPriceUsdCents?: number;
  taxMarkupBps: number;
  accountCurrency: AccountCurrency;
  rateScaled?: number;
  scale?: number;
}): number {
  const listPriceCents = input.listPriceCents ?? input.listPriceUsdCents;
  if (listPriceCents === undefined) {
    throw new SubscriptionAmountError("Falta el precio lista");
  }
  const listCurrency = input.listCurrency ?? "USD";

  const { totalCents } = computeSubscriptionListBreakdown({
    listPriceCents,
    listCurrency,
    taxMarkupBps: input.taxMarkupBps,
  });

  if (listCurrency === input.accountCurrency) {
    return totalCents;
  }

  const rateScaled = input.rateScaled;
  const scale = input.scale ?? CONSOLIDATION_RATE_SCALE;

  if (
    rateScaled === undefined ||
    !Number.isInteger(rateScaled) ||
    rateScaled <= 0
  ) {
    throw new SubscriptionAmountError(
      "Falta tipo de cambio ARS/USD para convertir el total",
    );
  }

  return convertArsUsdCents(
    totalCents,
    listCurrency,
    input.accountCurrency,
    rateScaled,
    scale,
  );
}

/**
 * Prefer an expense category matching `preferredName` (emoji-tolerant), then
 * Servicios / Ocio, otherwise the first expense category.
 */
export function preferSubscriptionCategoryId(
  categories: readonly { id: string; name: string; kind: string }[],
  preferredName?: string | null,
): string | null {
  const expenses = categories.filter((c) => c.kind === "expense");
  if (expenses.length === 0) return null;

  if (preferredName) {
    const target = categoryNameKey(preferredName);
    if (target) {
      const exact = expenses.find((c) => categoryNameKey(c.name) === target);
      if (exact) return exact.id;
    }
  }

  const fallbacks = ["servicios", "ocio"];
  for (const needle of fallbacks) {
    const hit = expenses.find((c) => categoryNameKey(c.name) === needle);
    if (hit) return hit.id;
  }

  const fuzzy = expenses.find((c) => {
    const n = categoryNameKey(c.name);
    return n.includes("servicio") || n.includes("ocio");
  });
  return fuzzy?.id ?? expenses[0]!.id;
}

/**
 * Prefer an ARS account for typical AR subscription debits; else first account.
 */
export function preferSubscriptionAccountId(
  accounts: readonly { id: string; currency: string }[],
): string | null {
  if (accounts.length === 0) return null;
  const ars = accounts.find((a) => a.currency === "ARS");
  return ars?.id ?? accounts[0]!.id;
}
