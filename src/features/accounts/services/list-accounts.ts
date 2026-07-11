import "server-only";
import { prisma } from "@/lib/prisma";
import {
  assertCanReadAccounts,
  calculateAccountBalance,
  type AccountBalance,
  type AccountType,
} from "@/features/accounts/domain";
import { requireMembership } from "@/features/workspaces/services";
import { loadWorkspaceBalanceEffects } from "@/features/transactions/services";

export type AccountWithBalance = {
  id: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalanceCents: number;
  creditLimitCents: number | null;
  isArchived: boolean;
  currentBalance: AccountBalance;
};

/**
 * SPEC-03 FR-02 / FR-03 — Lists accounts of a workspace and computes the
 * derived `currentBalance` for each using every transaction in the workspace.
 *
 * The whole workspace ledger is loaded once (a single query) and reused for
 * every account instead of running one query per account.
 */
export async function listAccounts({
  userId,
  workspaceId,
  includeArchived = false,
}: {
  userId: string;
  workspaceId: string;
  includeArchived?: boolean;
}): Promise<AccountWithBalance[]> {
  const { role } = await requireMembership(userId, workspaceId);
  assertCanReadAccounts(role);

  const [accounts, effects] = await Promise.all([
    prisma.financeAccount.findMany({
      where: {
        workspaceId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        name: true,
        type: true,
        currency: true,
        initialBalanceCents: true,
        creditLimitCents: true,
        isArchived: true,
      },
    }),
    loadWorkspaceBalanceEffects(workspaceId),
  ]);

  return accounts.map((a) => {
    const account = {
      id: a.id,
      type: a.type as AccountType,
      currency: a.currency,
      initialBalanceCents: a.initialBalanceCents,
    };
    return {
      id: a.id,
      workspaceId: a.workspaceId,
      name: a.name,
      type: a.type as AccountType,
      currency: a.currency,
      initialBalanceCents: a.initialBalanceCents,
      creditLimitCents: a.creditLimitCents,
      isArchived: a.isArchived,
      currentBalance: calculateAccountBalance(account, effects),
    };
  });
}
