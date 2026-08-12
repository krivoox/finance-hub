import { describe, expect, it } from "vitest";

import {
  OFFLINE_DRAFT_STORAGE_KEY,
  clearOfflineDraftFromStorage,
  isOfflineTransactionDraft,
  readOfflineDraftFromStorage,
  writeOfflineDraftToStorage,
  type OfflineTransactionDraft,
} from "./offline-draft";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

const sample: OfflineTransactionDraft = {
  type: "expense",
  amountUnits: "12.50",
  description: "Café",
  occurredOn: "2026-08-12",
  updatedAt: "2026-08-12T12:00:00.000Z",
};

describe("offline-draft (SPEC-20 H5)", () => {
  it("validates draft shape", () => {
    expect(isOfflineTransactionDraft(sample)).toBe(true);
    expect(isOfflineTransactionDraft({ ...sample, type: "transfer" })).toBe(
      false,
    );
    expect(isOfflineTransactionDraft(null)).toBe(false);
  });

  it("round-trips through storage", () => {
    const storage = memoryStorage();
    expect(writeOfflineDraftToStorage(storage, sample)).toBe(true);
    expect(readOfflineDraftFromStorage(storage)).toEqual(sample);
    clearOfflineDraftFromStorage(storage);
    expect(readOfflineDraftFromStorage(storage)).toBeNull();
  });

  it("ignores corrupt payloads", () => {
    const storage = memoryStorage({
      [OFFLINE_DRAFT_STORAGE_KEY]: "{not-json",
    });
    expect(readOfflineDraftFromStorage(storage)).toBeNull();
  });
});
