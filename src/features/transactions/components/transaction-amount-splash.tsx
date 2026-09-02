"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import { formatSignedMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";

import {
  SPLASH_FADE_OUT_MS,
  SPLASH_HOLD_MS,
  useTransactionFeedbackStore,
} from "../stores/transaction-feedback-store";

const KIND_LABEL: Record<
  "income" | "expense" | "transfer" | "adjustment",
  string
> = {
  income: "Ingreso registrado",
  expense: "Gasto registrado",
  transfer: "Transferencia registrada",
  adjustment: "Saldo ajustado",
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full-viewport confirmation of the amount just registered. Plays while the
 * Server Action's `revalidatePath` + `router.refresh()` catch up. Patrimonio
 * stays on the server — this overlay never invents a saldo.
 */
export function TransactionAmountSplash() {
  const splash = useTransactionFeedbackStore((s) => s.splash);
  const clearSplash = useTransactionFeedbackStore((s) => s.clearSplash);
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    if (splash && prefersReducedMotion()) {
      clearSplash();
    }
  }, [splash, clearSplash]);

  useEffect(() => {
    if (!splash) {
      setExiting(false);
      return;
    }

    if (prefersReducedMotion()) return;

    setExiting(false);

    const startExit = window.setTimeout(() => {
      setExiting(true);
    }, SPLASH_HOLD_MS);
    const hide = window.setTimeout(() => {
      clearSplash();
    }, SPLASH_HOLD_MS + SPLASH_FADE_OUT_MS);

    return () => {
      window.clearTimeout(startExit);
      window.clearTimeout(hide);
    };
  }, [splash, clearSplash]);

  if (!splash) return null;

  // Adjustment splash already receives signedEffect (target − current).
  const signed =
    splash.kind === "income"
      ? splash.amountCents
      : splash.kind === "expense"
        ? -splash.amountCents
        : splash.amountCents;

  const toneClass =
    splash.kind === "income" || (splash.kind === "adjustment" && signed > 0)
      ? "text-income"
      : splash.kind === "expense" || (splash.kind === "adjustment" && signed < 0)
        ? "text-expense"
        : "text-foreground";

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-6 backdrop-blur-[2px] transition-opacity duration-200 ease-out",
        exiting ? "opacity-0" : "opacity-100",
      )}
      role="status"
      aria-live="polite"
      aria-label={KIND_LABEL[splash.kind]}
    >
      <p
        className={cn(
          "animate-in fade-in zoom-in-95 font-heading text-4xl font-extrabold tracking-tight tabular duration-300 sm:text-5xl",
          toneClass,
        )}
      >
        {formatSignedMoney(signed, splash.currency)}
      </p>
    </div>
  );
}
