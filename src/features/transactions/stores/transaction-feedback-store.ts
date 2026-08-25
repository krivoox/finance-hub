"use client";

import { create } from "zustand";

export type TransactionFeedbackKind = "income" | "expense" | "transfer";

export type TransactionFeedbackSplash = {
  amountCents: number;
  currency: string;
  kind: TransactionFeedbackKind;
};

type TransactionFeedbackState = {
  splash: TransactionFeedbackSplash | null;
  moneyPending: boolean;
  showFeedback: (splash: TransactionFeedbackSplash) => void;
  clearSplash: () => void;
  clearMoneyPending: () => void;
};

/**
 * Ephemeral UI after registering a movement: amount splash + dimmed money
 * surfaces until the RSC refresh lands. Never stores a computed saldo.
 */
export const useTransactionFeedbackStore = create<TransactionFeedbackState>(
  (set) => ({
    splash: null,
    moneyPending: false,
    showFeedback: (splash) => set({ splash, moneyPending: true }),
    clearSplash: () => set({ splash: null }),
    clearMoneyPending: () => set({ moneyPending: false }),
  }),
);
