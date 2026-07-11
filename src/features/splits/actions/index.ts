"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  attachSplitSchema,
  createSettlementSchema,
  deleteSettlementSchema,
} from "@/features/splits/schemas";
import {
  attachSplitToExpense,
  createSettlement,
  deleteSettlement,
} from "@/features/splits/services";
import { SplitDomainError } from "@/features/splits/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function errorMessage(err: unknown): string {
  if (err instanceof SplitDomainError) return err.message;
  if (err instanceof WorkspaceDomainError) return err.message;
  if (err instanceof Error) return err.message;
  return "Error inesperado";
}

export async function attachSplitAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = attachSplitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const data = parsed.data;
    const base = {
      userId: session.user.id,
      workspaceId: data.workspaceId,
      expenseTransactionId: data.expenseTransactionId,
      paidByUserId: data.paidByUserId,
    };
    const split =
      data.method === "equal"
        ? await attachSplitToExpense({
            ...base,
            method: "equal",
            participantUserIds: data.participantUserIds,
          })
        : data.method === "percentage"
          ? await attachSplitToExpense({
              ...base,
              method: "percentage",
              percentages: data.percentages,
            })
          : await attachSplitToExpense({
              ...base,
              method: "exact",
              exactShares: data.exactShares,
            });

    revalidatePath("/groups");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { ok: true, data: { id: split.id } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function createSettlementAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createSettlementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const settlement = await createSettlement({
      userId: session.user.id,
      ...parsed.data,
    });
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: settlement.id } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteSettlementAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = deleteSettlementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const result = await deleteSettlement({
      userId: session.user.id,
      settlementId: parsed.data.settlementId,
    });
    revalidatePath("/groups");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
