"use server";

import { getSession } from "@/lib/session";
import { listAccounts } from "@/features/accounts/services";
import { listCategories } from "@/features/categories/services";
import {
  getActiveWorkspaceForUser,
  listMembers,
} from "@/features/workspaces/services";
import { listPaymentAccountsForUser } from "@/features/transactions/services";
import { transactionErrorToMessage, type ActionResult } from "./errors";

export type NewTransactionFormAccountOption = {
  id: string;
  name: string;
  currency: string;
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
};

export type NewTransactionFormPaymentGroup = {
  workspaceId: string;
  workspaceName: string;
  workspaceType: "personal" | "group";
  accounts: readonly NewTransactionFormAccountOption[];
};

export type NewTransactionFormCategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

export type NewTransactionFormMemberOption = {
  userId: string;
  displayName: string;
};

export type NewTransactionFormOptions = {
  workspaceId: string;
  workspaceName: string;
  workspaceCurrency: string;
  workspaceType: "personal" | "group";
  accounts: NewTransactionFormAccountOption[];
  paymentAccountGroups: NewTransactionFormPaymentGroup[];
  categories: NewTransactionFormCategoryOption[];
  groupMembers: NewTransactionFormMemberOption[];
  currentUserId: string;
};

/**
 * Lightweight options payload for the global new-transaction FormSheet.
 * Resolves the active workspace server-side (cookie) — no client workspaceId required.
 */
export async function getNewTransactionFormOptionsAction(): Promise<
  ActionResult<NewTransactionFormOptions>
> {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "No autenticado" };

  try {
    const workspace = await getActiveWorkspaceForUser(session.user.id);
    if (!workspace) {
      return { ok: false, error: "Todavía no tenés un workspace activo." };
    }
    if (workspace.role === "viewer") {
      return {
        ok: false,
        error: "No tenés permiso para registrar transacciones.",
      };
    }

    const [accounts, categories, members, paymentGroups] = await Promise.all([
      listAccounts({
        userId: session.user.id,
        workspaceId: workspace.id,
      }),
      listCategories({
        userId: session.user.id,
        workspaceId: workspace.id,
      }),
      workspace.type === "group"
        ? listMembers(session.user.id, workspace.id)
        : Promise.resolve([]),
      listPaymentAccountsForUser(session.user.id),
    ]);

    const activeAccounts = accounts.filter((a) => !a.isArchived);
    const activeCategories = categories.filter((c) => !c.isArchived);

    return {
      ok: true,
      data: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceCurrency: workspace.baseCurrency,
        workspaceType: workspace.type,
        accounts: activeAccounts.map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceType: workspace.type,
        })),
        paymentAccountGroups: paymentGroups.map((g) => ({
          workspaceId: g.workspaceId,
          workspaceName: g.workspaceName,
          workspaceType: g.workspaceType,
          accounts: g.accounts.map((a) => ({
            id: a.id,
            name: a.name,
            currency: a.currency,
            workspaceId: a.workspaceId,
            workspaceName: a.workspaceName,
            workspaceType: a.workspaceType,
          })),
        })),
        categories: activeCategories.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
        })),
        groupMembers:
          workspace.type === "group"
            ? members.map((m) => ({
                userId: m.userId,
                displayName:
                  m.user.displayName?.trim() || m.user.name || m.user.email,
              }))
            : [],
        currentUserId: session.user.id,
      },
    };
  } catch (err) {
    return { ok: false, error: transactionErrorToMessage(err) };
  }
}
