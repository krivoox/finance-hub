/**
 * In-memory / sessionStorage draft for offline load form (SPEC-20 H5).
 * No durable IndexedDB queue in MVP.
 */

export const OFFLINE_DRAFT_STORAGE_KEY = "fh:offline-tx-draft:v1";

export type OfflineTransactionDraft = {
  type: "expense" | "income";
  amountUnits: string;
  description: string;
  occurredOn: string;
  updatedAt: string;
};

export function isOfflineTransactionDraft(
  value: unknown,
): value is OfflineTransactionDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (
    (draft.type === "expense" || draft.type === "income") &&
    typeof draft.amountUnits === "string" &&
    typeof draft.description === "string" &&
    typeof draft.occurredOn === "string" &&
    typeof draft.updatedAt === "string"
  );
}

export function readOfflineDraftFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined,
): OfflineTransactionDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(OFFLINE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isOfflineTransactionDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeOfflineDraftToStorage(
  storage: Pick<Storage, "setItem"> | null | undefined,
  draft: OfflineTransactionDraft,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(OFFLINE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineDraftFromStorage(
  storage: Pick<Storage, "removeItem"> | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.removeItem(OFFLINE_DRAFT_STORAGE_KEY);
  } catch {
    // private mode / quota
  }
}
