/**
 * Client-side dismissals for the Cafecito donation dialog.
 * TTL so the soft ask can resurface after a quiet period.
 */

export const CAFECITO_STORAGE_KEY = "fh:cafecito:v1";

/** Re-show after 30 days unless the user opens it manually. */
export const CAFECITO_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

type DismissState = {
  dismissedAt: number;
};

export function isCafecitoDismissed(): boolean {
  try {
    const raw = localStorage.getItem(CAFECITO_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissState;
    if (typeof parsed.dismissedAt !== "number") return false;
    return Date.now() - parsed.dismissedAt < CAFECITO_DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissCafecito(): void {
  try {
    const payload: DismissState = { dismissedAt: Date.now() };
    localStorage.setItem(CAFECITO_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota
  }
}
