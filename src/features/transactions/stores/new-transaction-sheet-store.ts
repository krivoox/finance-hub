import { create } from "zustand";

import type { CreateableTransactionType } from "@/features/transactions/domain";

/**
 * UI-only store for the global “Nueva transacción” FormSheet (H1).
 * Opens instantly from any authenticated route; form options load async.
 */
type NewTransactionSheetState = {
  open: boolean;
  /** Prefill type from PWA shortcuts / `?new=expense|income`. */
  initialType: CreateableTransactionType;
  openSheet: (opts?: { initialType?: CreateableTransactionType }) => void;
  closeSheet: () => void;
  setOpen: (open: boolean) => void;
};

export const useNewTransactionSheetStore = create<NewTransactionSheetState>(
  (set) => ({
    open: false,
    initialType: "expense",
    openSheet: (opts) =>
      set({
        open: true,
        initialType: opts?.initialType ?? "expense",
      }),
    closeSheet: () => set({ open: false, initialType: "expense" }),
    setOpen: (open) =>
      set((state) => ({
        open,
        initialType: open ? state.initialType : "expense",
      })),
  }),
);
