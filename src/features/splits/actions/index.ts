"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  addGhostMemberSchema,
  createExpenseWithSplitSchema,
  createSettlementSchema,
  createSplitGroupSchema,
  deleteSettlementSchema,
  joinSplitGroupSchema,
  renameSplitGroupSchema,
} from "@/features/splits/schemas";
import {
  addGhostMember,
  createExpenseWithSplit,
  createSettlement,
  createSplitGroup,
  deleteSettlement,
  joinSplitGroup,
  renameSplitGroup,
} from "@/features/splits/services";
import { SplitDomainError } from "@/features/splits/domain";
import { WorkspaceDomainError } from "@/features/workspaces/domain";
import { TransactionDomainError } from "@/features/transactions/domain";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function errorMessage(err: unknown): string {
  if (err instanceof SplitDomainError) {
    switch (err.name) {
      case "InvalidSplitGroupNameError":
        return "Poné un nombre para el grupo.";
      case "InvalidGhostNameError":
        return "Poné cómo se llama.";
      case "DuplicateGhostNameError":
        return "Ya hay alguien con ese nombre en el grupo.";
      case "AlreadySplitGroupMemberError":
        return "Ya estás en este grupo.";
      case "GhostCannotPayError":
        return "Una persona sin la app no puede registrar el pago.";
      case "NotSplitGroupUserMemberError":
      case "SplitNotFoundError":
      case "ForbiddenSplitGroupActionError":
        return "No tenés acceso a este grupo.";
      case "SplitGroupTooSmallError":
        return "Sumá a alguien más para dividir el gasto.";
      case "SplitMemberNotInGroupError":
        return "Esa persona no está en el grupo.";
      case "SplitCurrencyMismatchError":
        return "El gasto tiene que ser en la misma moneda del grupo.";
      case "SplitSumMismatchError":
        return "Las partes no suman el total.";
      case "InvalidPercentageError":
        return "Los porcentajes tienen que sumar 100.";
      case "InvalidPublicShareTokenError":
        return "Este enlace no es válido.";
      default:
        return err.message;
    }
  }
  if (err instanceof WorkspaceDomainError) return err.message;
  if (err instanceof TransactionDomainError) return err.message;
  if (err instanceof Error) return err.message;
  return "Error inesperado";
}

function revalidateSplitPaths(splitGroupId?: string) {
  revalidatePath("/groups");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/budgets");
  if (splitGroupId) {
    revalidatePath(`/groups/${splitGroupId}`);
  }
}

export async function createSplitGroupAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createSplitGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const group = await createSplitGroup({
      userId: session.user.id,
      name: parsed.data.name,
      kind: parsed.data.kind,
    });
    revalidateSplitPaths(group.id);
    return { ok: true, data: { id: group.id } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function renameSplitGroupAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = renameSplitGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const group = await renameSplitGroup({
      userId: session.user.id,
      splitGroupId: parsed.data.splitGroupId,
      name: parsed.data.name,
    });
    revalidateSplitPaths(group.id);
    return { ok: true, data: { id: group.id } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function addGhostMemberAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = addGhostMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const member = await addGhostMember({
      userId: session.user.id,
      splitGroupId: parsed.data.splitGroupId,
      displayName: parsed.data.displayName,
    });
    revalidateSplitPaths(parsed.data.splitGroupId);
    return { ok: true, data: { id: member.id } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function joinSplitGroupAction(
  input: unknown,
): Promise<ActionResult<{ splitGroupId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = joinSplitGroupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const result = await joinSplitGroup({
      userId: session.user.id,
      token: parsed.data.token,
    });
    revalidateSplitPaths(result.splitGroupId);
    return { ok: true, data: { splitGroupId: result.splitGroupId } };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function createExpenseWithSplitAction(
  input: unknown,
): Promise<ActionResult<{ transactionId: string; splitId: string }>> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  const parsed = createExpenseWithSplitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const data = parsed.data;
    const result =
      data.method === "equal"
        ? await createExpenseWithSplit({
            userId: session.user.id,
            workspaceId: data.workspaceId,
            splitGroupId: data.splitGroupId,
            accountId: data.accountId,
            categoryId: data.categoryId,
            amountCents: data.amountCents,
            occurredOn: data.occurredOn,
            description: data.description,
            currency: data.currency,
            method: "equal",
          })
        : data.method === "percentage"
          ? await createExpenseWithSplit({
              userId: session.user.id,
              workspaceId: data.workspaceId,
              splitGroupId: data.splitGroupId,
              accountId: data.accountId,
              categoryId: data.categoryId,
              amountCents: data.amountCents,
              occurredOn: data.occurredOn,
              description: data.description,
              currency: data.currency,
              method: "percentage",
              percentages: data.percentages,
            })
          : await createExpenseWithSplit({
              userId: session.user.id,
              workspaceId: data.workspaceId,
              splitGroupId: data.splitGroupId,
              accountId: data.accountId,
              categoryId: data.categoryId,
              amountCents: data.amountCents,
              occurredOn: data.occurredOn,
              description: data.description,
              currency: data.currency,
              method: "exact",
              exactShares: data.exactShares,
            });

    revalidateSplitPaths(data.splitGroupId);
    return {
      ok: true,
      data: {
        transactionId: result.transaction.id,
        splitId: result.splitId,
      },
    };
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const settlement = await createSettlement({
      userId: session.user.id,
      ...parsed.data,
    });
    revalidateSplitPaths(parsed.data.splitGroupId);
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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
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
