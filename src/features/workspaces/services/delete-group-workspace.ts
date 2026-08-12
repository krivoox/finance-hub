import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  assertCanDeleteGroupWorkspace,
  assertConfirmationNameMatches,
  assertNoCrossWorkspaceInvolvement,
  pickPreferredActiveWorkspace,
  type WorkspaceType,
} from "@/features/workspaces/domain";
import {
  ACTIVE_WORKSPACE_COOKIE,
  setActiveWorkspaceCookie,
} from "./active-workspace";
import { hasCrossWorkspaceInvolvement } from "./has-cross-workspace-involvement";
import { requireMembership } from "./require-membership";

export type DeleteGroupWorkspaceServiceInput = {
  callerUserId: string;
  workspaceId: string;
  /** When provided, must match the workspace name exactly (FR-13). */
  confirmName?: string;
};

export type DeleteGroupWorkspaceResult = {
  nextActiveWorkspaceId: string | null;
};

/**
 * SPEC-02 FR-10 — Hard-delete a group workspace and its tenant graph.
 * Order follows SPEC-02 §11 (Restrict FKs; children categories before parents).
 */
export async function deleteGroupWorkspace({
  callerUserId,
  workspaceId,
  confirmName,
}: DeleteGroupWorkspaceServiceInput): Promise<DeleteGroupWorkspaceResult> {
  const { role } = await requireMembership(callerUserId, workspaceId);

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { id: true, name: true, type: true },
  });

  assertCanDeleteGroupWorkspace(role, workspace.type as WorkspaceType);

  if (confirmName !== undefined) {
    assertConfirmationNameMatches(workspace.name, confirmName);
  }

  const involved = await hasCrossWorkspaceInvolvement(workspaceId);
  assertNoCrossWorkspaceInvolvement(involved);

  const cookieStore = await cookies();
  const wasActive =
    cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value === workspaceId;

  await prisma.$transaction(async (tx) => {
    // 1. CurrencyExchange
    await tx.currencyExchange.deleteMany({ where: { workspaceId } });

    // 2. GoalContribution via Goal
    await tx.goalContribution.deleteMany({
      where: { goal: { workspaceId } },
    });

    // 3–4. ExpenseSplitShare → ExpenseSplit
    await tx.expenseSplitShare.deleteMany({
      where: { split: { workspaceId } },
    });
    await tx.expenseSplit.deleteMany({ where: { workspaceId } });

    // 5. Settlement
    await tx.settlement.deleteMany({ where: { workspaceId } });

    // 6. Transaction (CrossWorkspaceLink cascades from Transaction when present;
    //    gated by §5.4 so none should remain that involve this workspace)
    await tx.transaction.deleteMany({ where: { workspaceId } });

    // 7. RecurringRule
    await tx.recurringRule.deleteMany({ where: { workspaceId } });

    // 8–9. BudgetCategory → Budget
    await tx.budgetCategory.deleteMany({
      where: { budget: { workspaceId } },
    });
    await tx.budget.deleteMany({ where: { workspaceId } });

    // 10. Goals — clear linkedAccountId (Restrict) then delete
    await tx.goal.updateMany({
      where: { workspaceId },
      data: { linkedAccountId: null },
    });
    await tx.goal.deleteMany({ where: { workspaceId } });

    // 11. Category — detach tree then delete (parentId Restrict)
    await tx.category.updateMany({
      where: { workspaceId },
      data: { parentId: null },
    });
    await tx.category.deleteMany({ where: { workspaceId } });

    // 12. FinanceAccount
    await tx.financeAccount.deleteMany({ where: { workspaceId } });

    // 13. WorkspaceConsolidationRate
    await tx.workspaceConsolidationRate.deleteMany({ where: { workspaceId } });

    // 14–15. Invitation + Membership
    await tx.invitation.deleteMany({ where: { workspaceId } });
    await tx.membership.deleteMany({ where: { workspaceId } });

    // 16. Workspace
    await tx.workspace.delete({ where: { id: workspaceId } });
  });

  if (!wasActive) {
    return { nextActiveWorkspaceId: null };
  }

  const remaining = await prisma.membership.findMany({
    where: { userId: callerUserId },
    select: {
      workspace: { select: { id: true, type: true } },
    },
  });

  const nextId = pickPreferredActiveWorkspace(
    remaining.map((m) => ({
      id: m.workspace.id,
      type: m.workspace.type as WorkspaceType,
    })),
  );

  if (nextId) {
    await setActiveWorkspaceCookie(nextId);
  }

  return { nextActiveWorkspaceId: nextId };
}
