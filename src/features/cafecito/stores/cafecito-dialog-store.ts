import { create } from "zustand";

/**
 * UI-only store for the global Cafecito donation dialog.
 * Auto-prompt and manual open (sidebar / Más) share the same surface.
 */
type CafecitoDialogState = {
  open: boolean;
  /** True when opened from a menu — bypasses dismiss TTL. */
  forced: boolean;
  openDialog: (opts?: { forced?: boolean }) => void;
  closeDialog: () => void;
  setOpen: (open: boolean) => void;
};

export const useCafecitoDialogStore = create<CafecitoDialogState>((set) => ({
  open: false,
  forced: false,
  openDialog: (opts) =>
    set({ open: true, forced: opts?.forced === true }),
  closeDialog: () => set({ open: false, forced: false }),
  setOpen: (open) =>
    set((state) => ({
      open,
      forced: open ? state.forced : false,
    })),
}));
