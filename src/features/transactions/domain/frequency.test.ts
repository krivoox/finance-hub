import { describe, expect, it } from "vitest";

import {
  TRANSACTION_FREQUENCIES,
  TRANSACTION_FREQUENCY_LABELS,
  frequencyHint,
  isTransactionFrequency,
  toRecurringFrequency,
  transactionSupportsRecurrence,
} from "./frequency";

describe("SPEC-23 — frequency mapping", () => {
  it("expone las 5 frecuencias con etiquetas", () => {
    expect(TRANSACTION_FREQUENCIES).toEqual([
      "once",
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ]);
    expect(TRANSACTION_FREQUENCY_LABELS.monthly).toBe("Mensual");
  });

  it("once no genera recurrencia", () => {
    expect(toRecurringFrequency("once")).toBeNull();
  });

  it("mapea las frecuencias recurrentes 1:1", () => {
    expect(toRecurringFrequency("daily")).toBe("daily");
    expect(toRecurringFrequency("weekly")).toBe("weekly");
    expect(toRecurringFrequency("monthly")).toBe("monthly");
    expect(toRecurringFrequency("yearly")).toBe("yearly");
  });

  it("produce hints naturales y null para once", () => {
    expect(frequencyHint("once")).toBeNull();
    expect(frequencyHint("monthly")).toBe("Se repite cada mes");
  });

  it("solo income/expense/transfer admiten recurrencia", () => {
    expect(transactionSupportsRecurrence("expense")).toBe(true);
    expect(transactionSupportsRecurrence("income")).toBe(true);
    expect(transactionSupportsRecurrence("transfer")).toBe(true);
    expect(transactionSupportsRecurrence("adjustment")).toBe(false);
  });

  it("isTransactionFrequency valida strings", () => {
    expect(isTransactionFrequency("daily")).toBe(true);
    expect(isTransactionFrequency("biweekly")).toBe(false);
    expect(isTransactionFrequency(null)).toBe(false);
  });
});
