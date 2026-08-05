import { create } from "zustand";

/**
 * UI-only store for the global “Nueva transacción” FormSheet (H1).
 * Opens instantly from any authenticated route; form options load async.
 */
type NewTransactionSheetState = {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  setOpen: (open: boolean) => void;
};

export const useNewTransactionSheetStore = create<NewTransactionSheetState>(
  (set) => ({
    open: false,
    openSheet: () => set({ open: true }),
    closeSheet: () => set({ open: false }),
    setOpen: (open) => set({ open }),
  }),
);
