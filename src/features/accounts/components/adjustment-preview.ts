import { NoAdjustmentNeededError } from "@/features/accounts/domain";
import { computeBalanceAdjustment } from "@/features/accounts/domain";
import type { AccountType } from "@/features/accounts/domain";
import { formatMoney, formatSignedMoney } from "@/lib/format-money";

export function isCreditCardAccount(type: AccountType | undefined): boolean {
  return type === "credit_card";
}

export function adjustmentTargetLabel(type: AccountType | undefined): string {
  return isCreditCardAccount(type) ? "Deuda real" : "Saldo real";
}

export function formatAdjustmentCurrent(
  type: AccountType | undefined,
  cents: number,
  currency: string,
): string {
  if (isCreditCardAccount(type) && cents > 0) {
    return `− ${formatMoney(cents, currency)}`;
  }
  return formatMoney(cents, currency);
}

export function buildAdjustmentPreview(input: {
  accountType: AccountType;
  currentBalanceCents: number;
  targetBalanceCents: number | null;
  currency: string;
}): { kind: "empty" | "noop" | "invalid" | "ready"; text: string } {
  if (input.targetBalanceCents === null) {
    return { kind: "empty", text: "" };
  }

  try {
    const plan = computeBalanceAdjustment({
      accountType: input.accountType,
      currentBalanceCents: input.currentBalanceCents,
      targetBalanceCents: input.targetBalanceCents,
    });
    const currentLabel = formatAdjustmentCurrent(
      input.accountType,
      input.currentBalanceCents,
      input.currency,
    );
    const targetLabel = formatAdjustmentCurrent(
      input.accountType,
      input.targetBalanceCents,
      input.currency,
    );
    const deltaAbs = formatMoney(plan.amountCents, input.currency);
    if (isCreditCardAccount(input.accountType)) {
      const direction =
        plan.signedEffect < 0 ? "La deuda baja" : "La deuda sube";
      return {
        kind: "ready",
        text: `Deuda hoy ${currentLabel} → ${targetLabel}. ${direction} ${deltaAbs}.`,
      };
    }
    const direction = plan.signedEffect > 0 ? "Se suman" : "Se restan";
    return {
      kind: "ready",
      text: `Hoy ${currentLabel} → ${targetLabel}. ${direction} ${deltaAbs}.`,
    };
  } catch (err) {
    if (err instanceof NoAdjustmentNeededError) {
      return {
        kind: "noop",
        text: "El saldo ya coincide con ese valor. No hace falta ajustar.",
      };
    }
    return {
      kind: "invalid",
      text:
        err instanceof Error
          ? err.message
          : "El saldo objetivo no es válido.",
    };
  }
}

export function formatAdjustmentSplash(
  signedEffect: number,
  currency: string,
): string {
  return formatSignedMoney(signedEffect, currency);
}
