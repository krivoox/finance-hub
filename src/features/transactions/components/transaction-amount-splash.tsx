"use client";

import { useEffect } from "react";

import { formatSignedMoney } from "@/lib/format-money";

import { useTransactionFeedbackStore } from "../stores/transaction-feedback-store";

/** DESIGN.md: UI motion &lt; 300ms. Overlay hold covers a typical RSC refresh. */
const SPLASH_MS = 280;
const MONEY_PENDING_MS = 520;

const KIND_LABEL: Record<
  "income" | "expense" | "transfer",
  string
> = {
  income: "Ingreso registrado",
  expense: "Gasto registrado",
  transfer: "Transferencia registrada",
};

/**
 * Full-viewport confirmation of the amount just registered. Plays while the
 * Server Action's `revalidatePath` + `router.refresh()` catch up. Patrimonio
 * stays on the server — this overlay never invents a saldo.
 */
export function TransactionAmountSplash() {
  const splash = useTransactionFeedbackStore((s) => s.splash);
  const clearSplash = useTransactionFeedbackStore((s) => s.clearSplash);
  const clearMoneyPending = useTransactionFeedbackStore(
    (s) => s.clearMoneyPending,
  );

  useEffect(() => {
    if (!splash) return;

    const hide = window.setTimeout(() => {
      clearSplash();
    }, SPLASH_MS);
    const pending = window.setTimeout(() => {
      clearMoneyPending();
    }, MONEY_PENDING_MS);

    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(pending);
    };
  }, [splash, clearSplash, clearMoneyPending]);

  if (!splash) return null;

  const signed =
    splash.kind === "income"
      ? splash.amountCents
      : splash.kind === "expense"
        ? -splash.amountCents
        : splash.amountCents;

  const toneClass =
    splash.kind === "income"
      ? "text-income"
      : splash.kind === "expense"
        ? "text-expense"
        : "text-foreground";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label={KIND_LABEL[splash.kind]}
    >
      <p
        className={`animate-in fade-in zoom-in-95 font-heading text-4xl font-extrabold tracking-tight tabular duration-300 sm:text-5xl ${toneClass}`}
      >
        {formatSignedMoney(signed, splash.currency)}
      </p>
    </div>
  );
}
