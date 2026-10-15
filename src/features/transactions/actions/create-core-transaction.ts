"use server";

import { getSession } from "@/lib/session";
import {
  coreTransactionTypeSchema,
  createCoreAdjustmentSchema,
  createCoreLedgerTransactionSchema,
} from "@/features/transactions/schemas";
import {
  createBalanceAdjustment as createBalanceAdjustmentService,
  createCoreTransaction as createCoreTransactionService,
} from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";
import { revalidateMoneyPaths } from "./revalidate-money-paths";

export type CreateCoreTransactionActionResult = {
  transactionId: string;
  /** Only for balance adjustments (SPEC-22). */
  signedEffect?: number;
  /** Set when the movement created an SPEC-18 recurring rule. */
  recurringRuleId?: string | null;
};

/**
 * SPEC-23 — Single entry point for the core transaction screen. Dispatches to
 * the ledger service (income/expense/transfer + optional split/recurrence) or
 * to the balance-adjustment service (SPEC-22) based on `type`.
 */
export async function createCoreTransactionAction(
  input: unknown,
): Promise<ActionResult<CreateCoreTransactionActionResult>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const typeProbe = coreTransactionTypeSchema.safeParse(
    (input as { type?: unknown } | null)?.type,
  );
  if (!typeProbe.success) {
    return { ok: false, error: "Tipo de movimiento inválido" };
  }

  try {
    if (typeProbe.data === "adjustment") {
      const parsed = createCoreAdjustmentSchema.safeParse(input);
      if (!parsed.success) {
        return {
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Datos inválidos",
        };
      }
      const tx = await createBalanceAdjustmentService({
        userId: session.user.id,
        workspaceId: parsed.data.workspaceId,
        accountId: parsed.data.accountId,
        targetBalanceCents: parsed.data.targetBalanceCents,
        occurredOn: parsed.data.occurredOn,
        description: parsed.data.description ?? null,
        currency: parsed.data.currency,
      });
      revalidateMoneyPaths();
      return {
        ok: true,
        data: {
          transactionId: tx.id,
          signedEffect: tx.signedEffect,
          recurringRuleId: null,
        },
      };
    }

    const parsed = createCoreLedgerTransactionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      };
    }

    const tx = await createCoreTransactionService({
      userId: session.user.id,
      workspaceId: parsed.data.workspaceId,
      type: parsed.data.type,
      accountId: parsed.data.accountId,
      counterpartyAccountId: parsed.data.counterpartyAccountId ?? null,
      categoryId: parsed.data.categoryId ?? null,
      amountCents: parsed.data.amountCents,
      occurredOn: parsed.data.occurredOn,
      description: parsed.data.description ?? null,
      currency: parsed.data.currency,
      frequency: parsed.data.frequency,
      groupSplit: parsed.data.groupSplit ?? null,
    });
    revalidateMoneyPaths({ groups: true });
    return {
      ok: true,
      data: {
        transactionId: tx.transactionId,
        recurringRuleId: tx.recurringRuleId,
      },
    };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
