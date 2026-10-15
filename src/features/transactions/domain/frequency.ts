/**
 * SPEC-23 — Transaction form frequency (pure domain).
 *
 * The core form exposes a single "Frecuencia" selector spanning `once` plus the
 * recurrence cadences. When a recurring cadence is chosen we create a real
 * `RecurringRule` (SPEC-18) alongside the movement. Adjustments cannot recur.
 */

import type { RecurringFrequency } from "@/features/recurring/domain";
import type { NewTransactionFormType } from "./types";

export const TRANSACTION_FREQUENCIES = [
  "once",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type TransactionFrequency = (typeof TRANSACTION_FREQUENCIES)[number];

export const TRANSACTION_FREQUENCY_LABELS: Record<TransactionFrequency, string> =
  {
    once: "Una vez",
    daily: "Diario",
    weekly: "Semanal",
    monthly: "Mensual",
    yearly: "Anual",
  };

export function isTransactionFrequency(
  value: unknown,
): value is TransactionFrequency {
  return (
    typeof value === "string" &&
    (TRANSACTION_FREQUENCIES as readonly string[]).includes(value)
  );
}

/** Types that can be turned into a `RecurringRule` (SPEC-18 §4.1). */
export function transactionSupportsRecurrence(
  type: NewTransactionFormType,
): boolean {
  return type === "income" || type === "expense" || type === "transfer";
}

/** `null` when the movement does not repeat. */
export function toRecurringFrequency(
  frequency: TransactionFrequency,
): RecurringFrequency | null {
  if (frequency === "once") return null;
  return frequency;
}

/** Natural-language hint shown under the selector; `null` for `once`. */
export function frequencyHint(
  frequency: TransactionFrequency,
): string | null {
  switch (frequency) {
    case "once":
      return null;
    case "daily":
      return "Se repite todos los días";
    case "weekly":
      return "Se repite cada semana";
    case "monthly":
      return "Se repite cada mes";
    case "yearly":
      return "Se repite cada año";
  }
}
