"use server";

import { getSession } from "@/lib/session";
import { listAccounts } from "@/features/accounts/services";
import type { AccountType } from "@/features/accounts/domain";
import { countCategoryUsage, listCategories } from "@/features/categories/services";
import { getActiveWorkspaceForUser } from "@/features/workspaces/services";
import { listSplitGroupsForExpenseForm } from "@/features/splits/services";
import type { SplitGroupMemberRef } from "@/features/splits/domain";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export type NewTransactionFormAccountOption = {
  id: string;
  name: string;
  currency: string;
  type: AccountType;
  currentBalanceCents: number;
};

export type NewTransactionFormCategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
  usageCount: number;
};

export type NewTransactionFormSplitGroupOption = {
  id: string;
  name: string;
  currency: string;
  memberCount: number;
  members: SplitGroupMemberRef[];
};

export type NewTransactionFormOptions = {
  workspaceId: string;
  workspaceName: string;
  workspaceCurrency: string;
  accounts: NewTransactionFormAccountOption[];
  categories: NewTransactionFormCategoryOption[];
  splitGroups: NewTransactionFormSplitGroupOption[];
  currentUserId: string;
};

export async function getNewTransactionFormOptionsAction(): Promise<
  ActionResult<NewTransactionFormOptions>
> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  try {
    const workspace = await getActiveWorkspaceForUser(session.user.id);
    if (!workspace) {
      return { ok: false, error: "No se pudo cargar tu cuenta." };
    }
    if (workspace.role === "viewer") {
      return {
        ok: false,
        error: "No tenés permiso para registrar transacciones.",
      };
    }

    const [accounts, categories, splitGroups, usageById] = await Promise.all([
      listAccounts({
        userId: session.user.id,
        workspaceId: workspace.id,
      }),
      listCategories({
        userId: session.user.id,
        workspaceId: workspace.id,
      }),
      listSplitGroupsForExpenseForm(session.user.id),
      countCategoryUsage({
        userId: session.user.id,
        workspaceId: workspace.id,
      }),
    ]);

    const activeAccounts = accounts.filter((a) => !a.isArchived);
    const activeCategories = categories.filter((c) => !c.isArchived);

    return {
      ok: true,
      data: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceCurrency: workspace.baseCurrency,
        accounts: activeAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          type: a.type,
          currentBalanceCents: a.currentBalance.amountCents,
        })),
        categories: activeCategories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          usageCount: usageById[c.id] ?? 0,
        })),
        splitGroups,
        currentUserId: session.user.id,
      },
    };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
