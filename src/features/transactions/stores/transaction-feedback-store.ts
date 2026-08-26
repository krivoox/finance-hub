"use client";

import { create } from "zustand";

export type TransactionFeedbackKind = "income" | "expense" | "transfer";

export type TransactionFeedbackSplash = {
  amountCents: number;
  currency: string;
  kind: TransactionFeedbackKind;
};

/** Fade-in (~300ms) + hold so the amount is readable. */
export const SPLASH_HOLD_MS = 1000;
export const SPLASH_FADE_OUT_MS = 200;
/** Safety cap so dimming never sticks if the RSC refresh is slow. */
export const MONEY_PENDING_MS = SPLASH_HOLD_MS + SPLASH_FADE_OUT_MS + 400;

type TransactionFeedbackState = {
  splash: TransactionFeedbackSplash | null;
  moneyPending: boolean;
  showFeedback: (splash: TransactionFeedbackSplash) => void;
  clearSplash: () => void;
  clearMoneyPending: () => void;
};

let moneyPendingTimer: ReturnType<typeof setTimeout> | null = null;

function clearMoneyPendingTimer() {
  if (moneyPendingTimer === null) return;
  clearTimeout(moneyPendingTimer);
  moneyPendingTimer = null;
}

/**
 * Ephemeral UI after registering a movement: amount splash + dimmed money
 * surfaces until the RSC refresh lands. Never stores a computed saldo.
 *
 * `moneyPending` is cleared on a store timer (not the splash effect) so hiding
 * the overlay cannot cancel the dim timeout and leave the ledger grayed out.
 */
export const useTransactionFeedbackStore = create<TransactionFeedbackState>(
  (set) => ({
    splash: null,
    moneyPending: false,
    showFeedback: (splash) => {
      clearMoneyPendingTimer();
      moneyPendingTimer = setTimeout(() => {
        moneyPendingTimer = null;
        set({ moneyPending: false });
      }, MONEY_PENDING_MS);
      set({ splash, moneyPending: true });
    },
    clearSplash: () => set({ splash: null }),
    clearMoneyPending: () => {
      clearMoneyPendingTimer();
      set({ moneyPending: false });
    },
  }),
);
