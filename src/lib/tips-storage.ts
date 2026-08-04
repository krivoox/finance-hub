/**
 * Client-side tip dismissals. Versioned key so we can reset tips on copy/UX changes.
 * Shape: `{ [tipId]: true }` for dismissed tips.
 */

export const TIPS_STORAGE_KEY = "fh:tips:v1";

export const TIP_IDS = {
  creditCardPay: "tip.credit_card_pay",
} as const;

export type TipId = (typeof TIP_IDS)[keyof typeof TIP_IDS];

type TipsState = Record<string, true>;

function readState(): TipsState {
  try {
    const raw = localStorage.getItem(TIPS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: TipsState = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === true) out[key] = true;
    }
    return out;
  } catch {
    return {};
  }
}

function writeState(state: TipsState) {
  try {
    localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private mode / quota
  }
}

export function isTipDismissed(tipId: TipId | string): boolean {
  return readState()[tipId] === true;
}

export function dismissTip(tipId: TipId | string): void {
  const next = { ...readState(), [tipId]: true as const };
  writeState(next);
}
